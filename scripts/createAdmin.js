require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const admin = require('../config/firebase-admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin credentials
    const adminEmail = 'admin@booknest.com';
    const adminPassword = 'Admin123!@#';
    const adminName = 'Admin User';

    // Check if admin already exists in MongoDB
    let user = await User.findOne({ email: adminEmail });
    
    if (user) {
      console.log('⚠️  Admin already exists in MongoDB!');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      
      // Update to admin role if not already
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log('✅ Updated user to admin role!');
      }
    } else {
      // Create admin in Firebase first
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(adminEmail);
        console.log('✅ Admin exists in Firebase');
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create in Firebase
          firebaseUser = await admin.auth().createUser({
            email: adminEmail,
            password: adminPassword,
            displayName: adminName,
            emailVerified: true
          });
          console.log('✅ Admin created in Firebase');
        } else {
          throw error;
        }
      }

      // Create in MongoDB
      const mongoUser = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        photoURL: 'https://i.ibb.co/9hMVP7p/admin-avatar.png',
        authProvider: 'email',
        uid: firebaseUser.uid,
        role: 'admin'
      });

      await mongoUser.save();
      console.log('✅ Admin created in MongoDB!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\n⚠️  Use these credentials to login on the website!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
