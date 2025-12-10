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
// @desc    Save or update user (upsert pattern like reference project)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, name, photoURL, authProvider, uid } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user's last login
      user.lastLogin = new Date();
      await user.save();
      console.log('✅ User updated:', email);
    } else {
      // Create new user
      user = new User({
        name: name || email.split('@')[0],
        email,
        photoURL: photoURL || '',
        authProvider: authProvider || 'email',
        uid: uid || null,
        role: 'user'
      });
      
      await user.save();
      console.log('✅ New user created:', email);
    }

    // Return user data
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message,
      details: error.toString()
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

// @route   POST /api/auth/user
// @desc    Save or update user (simple upsert pattern like reference project)
// @access  Public
router.post('/user', async (req, res) => {
  try {
    const userData = req.body;
    const email = userData.email;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    console.log('User Already Exists---> ', !!existingUser);

    if (existingUser) {
      // Update last login
      console.log('Updating user info......');
      existingUser.lastLogin = new Date();
      
      // Update name and photo if provided
      if (userData.name && userData.name !== existingUser.name) {
        existingUser.name = userData.name;
      }
      if ((userData.image || userData.photoURL) && userData.image !== existingUser.photoURL) {
        existingUser.photoURL = userData.image || userData.photoURL;
      }
      
      await existingUser.save();
      
      return res.json({
        success: true,
        message: 'User updated',
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          photoURL: existingUser.photoURL,
          role: existingUser.role
        }
      });
    }

    // Create new user
    console.log('Saving new user info......');
    
    // Try to get uid from Firebase Auth to link accounts
    let uid = userData.uid || null;
    
    const newUser = new User({
      name: userData.name || email.split('@')[0],
      email: email,
      photoURL: userData.image || userData.photoURL || '',
      role: 'user',
      authProvider: 'google',
      uid: uid, // Set uid to link with Firebase
      createdAt: new Date(),
      lastLogin: new Date()
    });

    await newUser.save();
    
    res.json({
      success: true,
      message: 'User created',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        photoURL: newUser.photoURL,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error in POST /user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
