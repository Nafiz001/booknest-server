require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const admin = require('../config/firebase-admin');

const recreateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@booknest.com';
    const adminPassword = 'Admin123!@#';
    const adminName = 'Admin User';

    // Delete from MongoDB
    await User.deleteOne({ email: adminEmail });
    console.log('🗑️  Deleted admin from MongoDB');

    // Delete from Firebase
    try {
      const firebaseUser = await admin.auth().getUserByEmail(adminEmail);
      await admin.auth().deleteUser(firebaseUser.uid);
      console.log('🗑️  Deleted admin from Firebase');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('ℹ️  Admin does not exist in Firebase');
      }
    }

    // Create in Firebase
    const firebaseUser = await admin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
      emailVerified: true
    });
    console.log('✅ Created admin in Firebase');

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
    console.log('✅ Created admin in MongoDB');

    console.log('\n📋 Admin Credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\n✅ Login on website now!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

recreateAdmin();
