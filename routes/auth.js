const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, photoURL, authProvider, uid } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password: authProvider === 'email' ? password : undefined,
      photoURL,
      authProvider: authProvider || 'email',
      uid: authProvider === 'google' ? uid : undefined
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (Firebase already authenticated, just sync with backend)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, authProvider, uid } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found. Please register first.' 
      });
    }

    // For Google auth, verify UID matches
    if (authProvider === 'google' && user.uid !== uid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid Google authentication' 
      });
    }

    // Firebase already validated the credentials, just return user data
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public (no authentication needed for logout)
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ 
    success: true, 
    message: 'Logout successful' 
  });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', verifyFirebaseToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      photoURL: req.user.photoURL,
      role: req.user.role
    }
  });
});

module.exports = router;
