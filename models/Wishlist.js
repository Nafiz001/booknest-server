const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book is required']
  }
}, {
  timestamps: true
});

// Ensure a user can't add the same book twice
wishlistSchema.index({ user: 1, book: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
