const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { verifyToken, isLibrarian, isAdmin } = require('../middleware/auth');
const { uploadToImgBB } = require('../utils/imageUpload');

// @route   GET /api/books
// @desc    Get all published books
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    
    let query = { status: 'published' };
    
    // Search by title or author
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }
    
    // Sorting
    let sortOption = {};
    if (sort === 'price-asc') sortOption.price = 1;
    else if (sort === 'price-desc') sortOption.price = -1;
    else if (sort === 'title') sortOption.title = 1;
    else sortOption.createdAt = -1; // Default: newest first
    
    const books = await Book.find(query)
      .populate('librarian', 'name email')
      .sort(sortOption);
    
    res.json({ success: true, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/books/:id
// @desc    Get single book
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('librarian', 'name email photoURL');
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    res.json({ success: true, book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/books
// @desc    Add new book
// @access  Private (Librarian/Admin)
router.post('/', verifyToken, isLibrarian, async (req, res) => {
  try {
    const bookData = { ...req.body };
    
    // Upload image to ImgBB if provided
    if (bookData.image && bookData.image.startsWith('data:image')) {
      const imageUrl = await uploadToImgBB(bookData.image);
      bookData.image = imageUrl;
    }
    
    bookData.librarian = req.user._id;
    
    const book = new Book(bookData);
    await book.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Book added successfully', 
      book 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/books/:id
// @desc    Update book
// @access  Private (Librarian/Admin - own books only for librarian)
router.patch('/:id', verifyToken, isLibrarian, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    // Librarians can only update their own books, admins can update any
    if (req.user.role === 'librarian' && book.librarian.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own books' 
      });
    }
    
    Object.assign(book, req.body);
    await book.save();
    
    res.json({ 
      success: true, 
      message: 'Book updated successfully', 
      book 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete book
// @access  Private (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Book deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/books/librarian/:librarianId
// @desc    Get books by librarian
// @access  Private
router.get('/librarian/:librarianId', verifyToken, async (req, res) => {
  try {
    const books = await Book.find({ librarian: req.params.librarianId })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/books/:id/status
// @desc    Update book status (publish/unpublish)
// @access  Private (Admin only)
router.patch('/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    res.json({ 
      success: true, 
      message: `Book ${status} successfully`, 
      book 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
