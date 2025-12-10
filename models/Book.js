const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Book cover image is required']
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Fiction', 'Non-Fiction', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Fantasy', 'Biography', 'Self-Help']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  isbn: {
    type: String,
    trim: true,
    default: ''
  },
  publisher: {
    type: String,
    trim: true,
    default: ''
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1'],
    default: null
  },
  language: {
    type: String,
    default: 'English'
  },
  status: {
    type: String,
    enum: ['published', 'unpublished'],
    default: 'unpublished'
  },
  librarian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Librarian is required']
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search
bookSchema.index({ title: 'text', author: 'text' });

module.exports = mongoose.model('Book', bookSchema);
