const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
// Allow all origins for development purposes to avoid CORS issues.
// In production, restrict this to specific origins.
app.use(cors({ origin: '*' }));

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth-db';

// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In a real app, this would be hashed
  name: { type: String, required: true },
  role: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service'
  });
});

// Registration (Simple)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email ||!password ||!name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }
    const user = new User({ email, password, name, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login (Simple)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      userId: user._id,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// List all users (for admin dashboard - demo only, no auth)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

  // Delete a user (admin only)
  // Expects a user ID as a URL parameter. Returns 200 on success.
  app.delete('/api/users/:userId', async (req, res) => {
    try {
      const result = await User.findByIdAndDelete(req.params.userId);
      if (!result) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
  });

// Seed Function (Simplified for demo)
async function seedUsers() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Seeding Admin user...');
    await User.insertMany([
      { email: 'admin@example.com', password: 'admin', name: 'Admin', role: 'admin' },
    ]);
    console.log('Users seeded successfully');
  }
}

seedUsers().catch(err => console.error('Error seeding users:', err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth Service running on port ${PORT} (listening on 0.0.0.0)`);
});