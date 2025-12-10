const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to download the service account key from Firebase Console:
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Select your project (booknest-7fdb9)
// 3. Go to Project Settings > Service Accounts
// 4. Click "Generate New Private Key"
// 5. Save the JSON file as 'serviceAccountKey.json' in the config folder
// 6. Make sure to add 'serviceAccountKey.json' to .gitignore!

let serviceAccount;

try {
  // Try to load service account from JSON file
  serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://booknest-7fdb9.firebaseio.com`
  });
  
  console.log('✅ Firebase Admin initialized with service account');
} catch (error) {
  // Fallback: Try to load from environment variables
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL) {
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    
    console.log('✅ Firebase Admin initialized with environment variables');
  } else {
    console.warn('⚠️ Firebase Admin not initialized - missing credentials');
    console.log('Please provide either:');
    console.log('1. serviceAccountKey.json file in config folder, OR');
    console.log('2. Environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  }
}

module.exports = admin;
