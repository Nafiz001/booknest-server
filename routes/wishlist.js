const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { verifyToken } = require('../middleware/auth');

// @route   POST /api/wishlist
// @desc    Add book to wishlist
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    
    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      user: req.user._id,
      book: bookId
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Book already in wishlist' 
      });
    }
    
    const wishlistItem = new Wishlist({
      user: req.user._id,
      book: bookId
    });
    
    await wishlistItem.save();
    await wishlistItem.populate('book');
    
    res.status(201).json({ 
      success: true, 
      message: 'Added to wishlist', 
      wishlistItem 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/wishlist/:userId
// @desc    Get user's wishlist
// @access  Private
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    // Ensure user can only see their own wishlist
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const wishlist = await Wishlist.find({ user: req.params.userId })
      .populate('book')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/wishlist/:id
// @desc    Remove from wishlist
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const wishlistItem = await Wishlist.findById(req.params.id);
    
    if (!wishlistItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in wishlist' 
      });
    }
    
    // Ensure user can only remove their own items
    if (wishlistItem.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    await wishlistItem.deleteOne();
    
    res.json({ 
      success: true, 
      message: 'Removed from wishlist' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
