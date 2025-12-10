require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin credentials - CHANGE THESE!
    const adminEmail = 'admin@booknest.com';
    const adminPassword = 'Admin123!@#';
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated user to admin role!');
      }
    } else {
      // Create new admin
      const admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        photoURL: 'https://i.ibb.co/9hMVP7p/admin-avatar.png',
        authProvider: 'email',
        role: 'admin'
      });

      await admin.save();
      console.log('✅ Admin created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\n⚠️  Change these credentials after first login!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
