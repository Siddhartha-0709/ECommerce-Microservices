const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-db';

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  category: { type: String },
  stock: { type: Number, default: 0 }
});

const Product = mongoose.model('Product', productSchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'product-service'
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Seed Function
async function seedProducts() {
  // Remove any existing products to start fresh
  await Product.deleteMany({});
  console.log('Existing products cleared from product catalog');

  console.log('Seeding 14 realistic demo products...');
  await Product.insertMany([
    // Electronics
    {
      name: 'Wireless Noise-Cancelling Headphones',
      description: 'Over-ear Bluetooth headphones with active noise cancellation, custom 40mm drivers, and up to 30 hours of battery life.',
      price: 199.50,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      category: 'Electronics',
      stock: 45
    },
    {
      name: 'Mechanical Gaming Keyboard',
      description: 'Compact RGB mechanical keyboard featuring tactile mechanical switches, customizable lighting, and durable aluminum top plate.',
      price: 89.00,
      imageUrl: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=800&q=80',
      category: 'Electronics',
      stock: 30
    },
    {
      name: 'Bluetooth Portable Speaker',
      description: 'Water-resistant outdoor wireless speaker delivering 360-degree sound with rich bass and 12-hour continuous playtime.',
      price: 49.99,
      imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
      category: 'Electronics',
      stock: 60
    },
    {
      name: 'Smart Home LED Light Bulb',
      description: 'Wi-Fi connected smart bulb featuring 16 million colors, dimmable warm-to-cool white light, and voice control integration.',
      price: 19.95,
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
      category: 'Electronics',
      stock: 100
    },
    // Clothing
    {
      name: 'Organic Cotton T-Shirt',
      description: 'Ultra-soft everyday crewneck t-shirt tailored from 100% certified organic ring-spun cotton.',
      price: 24.50,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
      category: 'Clothing',
      stock: 85
    },
    {
      name: 'Lightweight Casual Hoodie',
      description: 'Cozy fleece pullover hoodie featuring an adjustable drawstring hood, kangaroo front pocket, and ribbed cuffs.',
      price: 45.00,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
      category: 'Clothing',
      stock: 50
    },
    // Home & Kitchen
    {
      name: 'Stainless Steel Water Bottle',
      description: 'Double-wall insulated stainless steel bottle that keeps beverages cold for up to 24 hours and hot for up to 12 hours.',
      price: 29.99,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
      category: 'Home & Kitchen',
      stock: 120
    },
    {
      name: 'Bamboo Cutting Board Set',
      description: 'Set of 3 eco-friendly organic bamboo chopping boards with built-in juice grooves and side handles.',
      price: 34.50,
      imageUrl: 'https://images.unsplash.com/photo-1588421357574-87938a86fa28?auto=format&fit=crop&w=800&q=80',
      category: 'Home & Kitchen',
      stock: 65
    },
    {
      name: 'Ceramic Coffee Mug',
      description: 'Hand-crafted 12oz stoneware ceramic mug with a comfortable matte finish handle, ideal for coffee or tea.',
      price: 16.00,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      category: 'Home & Kitchen',
      stock: 90
    },
    // Fitness
    {
      name: 'Fitness Tracker Watch',
      description: 'Sleek fitness smartwatch with continuous heart rate monitoring, sleep tracking, GPS, and multi-sport activity modes.',
      price: 64.99,
      imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
      category: 'Fitness',
      stock: 40
    },
    {
      name: 'Yoga Mat',
      description: 'Non-slip 6mm eco-friendly TPE exercise mat offering cushioned support for yoga, pilates, and floor workouts.',
      price: 32.00,
      imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80',
      category: 'Fitness',
      stock: 75
    },
    // Accessories
    {
      name: 'Travel Backpack',
      description: 'Durable 30L weather-resistant travel backpack equipped with a padded 15.6" laptop sleeve and anti-theft pocket.',
      price: 74.99,
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      category: 'Accessories',
      stock: 35
    },
    {
      name: 'Minimalist Leather Wallet',
      description: 'Slim front-pocket bi-fold wallet made from premium full-grain leather with built-in RFID blocking technology.',
      price: 38.00,
      imageUrl: 'https://images.unsplash.com/photo-1626639745370-7e6c2396dbc5?auto=format&fit=crop&w=800&q=80',
      category: 'Accessories',
      stock: 55
    },
    // Food
    {
      name: 'Premium Dark Chocolate Box',
      description: 'Artisanal gift box containing 16 handcrafted dark chocolate truffles with 70% single-origin cacao.',
      price: 22.50,
      imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=800&q=80',
      category: 'Food',
      stock: 110
    }
  ]);
  console.log('14 realistic products seeded successfully');
}

seedProducts().catch(err => console.error('Error seeding products:', err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Product Service running on port ${PORT} (listening on 0.0.0.0)`);
});