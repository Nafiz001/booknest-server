const admin = require('../config/firebase-admin');

const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided. Please login again.' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user from database using Firebase UID
    const User = require('../models/User');
    const user = await User.findOne({ uid: decodedToken.uid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please register first.' 
      });
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      photoURL: user.photoURL
    };

    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format. Please login again.' 
      });
    }

    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token. Please login again.',
      error: error.message 
    });
  }
};

module.exports = verifyFirebaseToken;
