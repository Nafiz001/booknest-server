const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

/**
 * Create a review
 * POST /api/reviews
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;
    
    // Check if user has ordered this book
    const hasOrdered = await Order.findOne({
      user: req.user._id,
      book: bookId,
      status: 'delivered'
    });
    
    if (!hasOrdered) {
      return res.status(403).json({
        success: false,
        message: 'You can only review books you have ordered and received'
      });
    }
    
    // Check if user already reviewed this book
    const existingReview = await Review.findOne({
      user: req.user._id,
      book: bookId
    });
    
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this book'
      });
    }
    
    const review = new Review({
      user: req.user._id,
      book: bookId,
      rating,
      comment
    });
    
    await review.save();
    
    // Populate user details for response
    await review.populate('user', 'name photoURL');
    
    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get reviews for a book
 * GET /api/reviews/book/:bookId
 */
router.get('/book/:bookId', async (req, res) => {
  try {
    const reviews = await Review.find({ book: req.params.bookId })
      .populate('user', 'name photoURL')
      .sort({ createdAt: -1 });
    
    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    
    res.json({
      success: true,
      reviews,
      avgRating: avgRating.toFixed(1),
      totalReviews: reviews.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get user's reviews
 * GET /api/reviews/user/:userId
 */
router.get('/user/:userId', verifyFirebaseToken, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId })
      .populate('book', 'title image author')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Update review
 * PATCH /api/reviews/:id
 */
router.patch('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Ensure user can only update their own review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { rating, comment } = req.body;
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    
    await review.save();
    await review.populate('user', 'name photoURL');
    
    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Delete review
 * DELETE /api/reviews/:id
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Ensure user can only delete their own review or admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await review.deleteOne();
    
    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Check if user can review a book
 * GET /api/reviews/can-review/:bookId
 */
router.get('/can-review/:bookId', verifyFirebaseToken, async (req, res) => {
  try {
    // Check if user has ordered and received the book
    const hasOrdered = await Order.findOne({
      user: req.user._id,
      book: req.params.bookId,
      status: 'delivered'
    });
    
    // Check if user already reviewed
    const existingReview = await Review.findOne({
      user: req.user._id,
      book: req.params.bookId
    });
    
    res.json({
      success: true,
      canReview: hasOrdered && !existingReview,
      hasOrdered: !!hasOrdered,
      hasReviewed: !!existingReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
