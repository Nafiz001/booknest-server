require('dotenv').config();
const { MongoClient } = require('mongodb');
const admin = require('../config/firebase-admin');

const recreateAdmin = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('booknestDB');
    const usersCollection = db.collection('users');

    const adminEmail = 'nafiz@shopcircuit.com';
    const adminPassword = 'Nafiz@123';
    const adminName = 'Nafiz Ahmed';

    // Delete from MongoDB
    await usersCollection.deleteOne({ email: adminEmail });
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
    await usersCollection.insertOne({
      name: adminName,
      email: adminEmail,
      photoURL: 'https://i.ibb.co/9hMVP7p/admin-avatar.png',
      uid: firebaseUser.uid,
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    console.log('✅ Created admin in MongoDB');

    console.log('\n📋 Admin Credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\n✅ Login on website now!');
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

recreateAdmin();
