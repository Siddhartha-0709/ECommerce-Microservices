# Setting up CI/CD for the E‑Commerce MERN Microservices

This guide describes how each micro‑service (Auth, Cart, Product, Order) is built, 
containerised and automatically deployed to the Kubernetes cluster using **GitHub 
Actions**, **Docker Hub**, a **GitOps** repository and **Argo CD**.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Directory structure](#directory-structure)
3. [GitHub Actions workflow](#github-actions-workflow)
   - 3.1 [Checkout source code](#checkout-source-code)
   - 3.2 [Docker Hub login](#docker-hub-login)
   - 3.3 [Set up Docker Buildx](#setup-docker-buildx)
   - 3.4 [Build & push multi‑arch image](#build--push-multi‑arch-image)
   - 3.5 [Update GitOps repo](#update-gitops-repo)
   - 3.6 [Commit & push changes](#commit‑push-gitops-changes)
4. [Argo CD sync](#argo-cd-sync)
5. [Secrets required in the repository](#required-secrets)
6. [Adding a new service](#adding-a-new-service)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Why we need it |
|------|----------------|
| Docker Hub account | Stores the built container images |
| GitHub repository for each micro‑service | Source code lives here |
| Separate **GitOps** repository (e.g. `ECommerce‑K8s‑GitOps`) | Contains the Kubernetes manifests that Argo CD watches |
| GitHub Actions runner (Ubuntu‑latest) | Executes the CI pipeline |
| Argo CD installed in the cluster | Performs the CD part (detects manifest changes & applies them) |

Make sure the following GitHub secrets are defined in **Settings → Secrets → Actions** of the *service* repository:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub user name |
| `DOCKERHUB_TOKEN` | Docker Hub **personal access token** (read/write) |
| `GITOPS_TOKEN` | A **personal access token** with `repo` scope for the GitOps repo |

---

## Directory structure

The workflow expects the repository to contain a folder with the same name as the service, e.g. `auth-service/`, `cart‑service/`, …

```
.
├── .github
│   └── workflows
│       └── auth-service.yml   # Example workflow file (see below)
├── auth-service
│   ├── Dockerfile
│   └── ...
├── cart-service
│   └── ...
└── README.md
```

---

## GitHub Actions workflow

Create a workflow file under `.github/workflows/<service_name>.yml`. Below is a **generic** template that works for any service – just replace `<SERVICE>` with the actual folder name.

```yaml
name: Build & Deploy <SERVICE>

on:
  push:
    branches: [main]
    paths:
      - '<SERVICE>/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # 1️⃣ Checkout the source code
      - name: Checkout code
        uses: actions/checkout@v4

      # 2️⃣ Log in to Docker Hub
      - name: Log in to Docker Hub
        run: |
          echo "${{ secrets.DOCKERHUB_TOKEN }}" | \
          docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin

      # 3️⃣ Set up Docker Buildx for multi‑arch builds
      - name: Set up Docker Buildx
        run: |
          docker buildx create --name multiarch-builder --use

      # 4️⃣ Build the image (amd64 & arm64) and push it
      - name: Build & push Docker image
        run: |
          docker buildx build \
            --platform linux/amd64,linux/arm64 \
            -t docker.io/${{ secrets.DOCKERHUB_USERNAME }}/<SERVICE>:${{ github.sha }} \
            -t docker.io/${{ secrets.DOCKERHUB_USERNAME }}/<SERVICE>:latest \
            --push \
            ./<SERVICE>

      # 5️⃣ Clone the GitOps repo (used by Argo CD)
      - name: Clone GitOps repository
        run: |
          git clone https://${{ secrets.GITOPS_TOKEN }}@github.com/Siddhartha-0709/ECommerce-K8s-GitOps.git gitops

      # 6️⃣ Update the image tag in the appropriate deployment manifest
      - name: Update image tag in GitOps repo
        run: |
          sed -i "s|image: docker.io/${{ secrets.DOCKERHUB_USERNAME }}/<SERVICE>:.*|image: docker.io/${{ secrets.DOCKERHUB_USERNAME }}/<SERVICE>:${{ github.sha }}|" \
          gitops/<SERVICE>-deploy/01deployment.yaml

      # 7️⃣ Commit the change and push back to the GitOps repo
      - name: Commit & push GitOps changes
        run: |
          cd gitops
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add <SERVICE>-deploy/01deployment.yaml
          git commit -m "Update <SERVICE> image to ${{ github.sha }}"
          git push
```

### How the workflow works

1. **Trigger** – The workflow runs on pushes to `main` that affect the service folder.
2. **Docker build** – A multi‑architecture image is built and pushed to Docker Hub. Two tags are created: a SHA‑based tag for traceability and `latest` for convenience.
3. **GitOps update** – The deployment manifest in the GitOps repo is updated to reference the new image tag.
4. **Commit** – The change is committed and pushed back to the GitOps repo.
5. **Argo CD** – Detects the changed file, pulls the new image and rolls the update out to the cluster.

---

## Argo CD sync

Argo CD continuously watches the GitOps repository. Once the workflow pushes an updated manifest, Argo CD sees the drift, marks the application as *Out‑of‑Sync* and, depending on the **auto‑sync** policy, applies the new version automatically.

If you need to trigger a manual sync:

```bash
argocd app sync <application-name>
```

---

## Required Secrets (re‑iteration)

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub user name (e.g., `siddhartha0709`) |
| `DOCKERHUB_TOKEN` | Docker Hub **personal access token** with `write:packages` |
| `GITOPS_TOKEN` | GitHub PAT for the GitOps repository – must have `repo` scope |

Add them via **Settings → Secrets → Actions** in each service repository.

---

## Adding a new service

1. Create a new folder `<new‑service>` with its Dockerfile and source code.
2. Add a corresponding deployment manifest under `gitops/<new‑service>-deploy/01deployment.yaml`.
3. Copy the workflow file above to `.github/workflows/<new‑service>.yml` and replace `<SERVICE>` placeholders.
4. Ensure the GitHub secrets above exist in the new repository.
5. Commit & push – the pipeline will now build, push and update the GitOps repo automatically.

---

## Troubleshooting

* **Docker login fails** – Verify that `DOCKERHUB_TOKEN` is a **token**, not your password. Tokens can be generated under Docker Hub *Account Settings → Security*.
* **GitOps repo clone error** – Ensure `GITOPS_TOKEN` has permission to clone the repo (private repos need a PAT with `repo` scope).
* **Argo CD does not sync** – Check the Argo CD UI for error messages. Common issues are mismatched image names or missing `imagePullSecrets`.
* **Workflow runs on every push** – The `paths` filter restricts runs to changes inside the service folder. If you notice unnecessary runs, double‑check the glob pattern.

---

> **Happy CI/CD!** 🎉

Feel free to open an issue in the repository if you encounter any problems or have suggestions for improvement.
