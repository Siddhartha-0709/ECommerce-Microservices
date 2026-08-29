// Order Service - server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

const PORT = process.env.PORT || 3004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/order-db';

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PLACED'
  },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'order-service'
  });
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, customerDetails, totalAmount } = req.body;
    
    if (!userId || !items || !totalAmount) {
      return res.status(400).json({ message: 'User ID, items, and total amount are required' });
    }

    const orderId = 'ORD-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const order = new Order({
      orderId,
      userId,
      items,
      customerDetails,
      totalAmount,
      status: 'PLACED'
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// Get orders by userId
app.get('/api/orders/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

  // Admin endpoint: fetch all orders across all users (legacy path)
  // This endpoint is intended for the admin UI to view every order.
  // It remains for backward compatibility but may be shadowed by more specific routes.
  app.get('/api/orders', async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching all orders', error: error.message });
    }
  });

  // New explicit admin endpoint to avoid route conflicts
  // Accessible via /api/admin/orders
  app.get('/api/admin/orders', async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching admin orders', error: error.message });
    }
  });

  // Delete an order (admin only)
  // DELETE /api/admin/orders/:orderId
  app.delete('/api/admin/orders/:orderId', async (req, res) => {
    try {
      const result = await Order.findOneAndDelete({ orderId: req.params.orderId });
      if (!result) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting order', error: error.message });
    }
  });

// Get order by ID
app.get('/api/orders/:userId/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, userId: req.params.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Order Service running on port ${PORT} (listening on 0.0.0.0)`);
});