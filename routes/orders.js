const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const { isLibrarian } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      user: req.user._id
    };
    
    const order = new Order(orderData);
    await order.save();
    
    await order.populate('book');
    
    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully', 
      order 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/orders/user/:userId
// @desc    Get user's orders
// @access  Private
router.get('/user/:userId', verifyFirebaseToken, async (req, res) => {
  try {
    // Ensure user can only see their own orders
    if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    const orders = await Order.find({ user: req.params.userId })
      .populate('book')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/orders/librarian/:librarianId
// @desc    Get orders for librarian's books
// @access  Private (Librarian/Admin)
router.get('/librarian/:librarianId', verifyFirebaseToken, isLibrarian, async (req, res) => {
  try {
    const Book = require('../models/Book');
    
    // Get all books by this librarian
    const books = await Book.find({ librarian: req.params.librarianId });
    const bookIds = books.map(book => book._id);
    
    // Get orders for these books
    const orders = await Order.find({ book: { $in: bookIds } })
      .populate('book')
      .populate('user', 'name email photoURL')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Private (Librarian/Admin)
router.patch('/:id/status', verifyFirebaseToken, isLibrarian, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('book').populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Order status updated', 
      order 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Private (User can cancel their own pending orders)
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Only allow cancellation of own orders and only if pending
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only cancel your own orders' 
      });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending orders can be cancelled' 
      });
    }
    
    order.status = 'cancelled';
    await order.save();
    
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('book')
      .populate('user', 'name email photoURL');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check authorization
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
