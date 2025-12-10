require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('./config/firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// JWT middleware
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    req.tokenUid = decoded.uid;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: 'Unauthorized Access!', err });
  }
};

// MongoDB Client
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db('booknestDB');
    const booksCollection = db.collection('books');
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');
    const wishlistCollection = db.collection('wishlist');
    const reviewsCollection = db.collection('reviews');

    // Role middlewares
    const verifyADMIN = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== 'admin')
        return res.status(403).send({ message: 'Admin only Actions!', role: user?.role });
      next();
    };

    const verifyLIBRARIAN = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await usersCollection.findOne({ email });
      if (user?.role !== 'librarian' && user?.role !== 'admin')
        return res.status(403).send({ message: 'Librarian only Actions!', role: user?.role });
      next();
    };

    // ==================== USER ROUTES ====================
    
    // Save or update user
    app.post('/api/auth/user', async (req, res) => {
      const userData = req.body;
      userData.createdAt = userData.createdAt || new Date().toISOString();
      userData.lastLogin = new Date().toISOString();
      userData.role = userData.role || 'user';

      const query = { email: userData.email };
      const alreadyExists = await usersCollection.findOne(query);
      console.log('User Already Exists---> ', !!alreadyExists);

      if (alreadyExists) {
        console.log('Updating user info......');
        const updateDoc = {
          $set: {
            lastLogin: new Date().toISOString(),
            name: userData.name || alreadyExists.name,
            photoURL: userData.image || userData.photoURL || alreadyExists.photoURL,
          },
        };
        await usersCollection.updateOne(query, updateDoc);
        return res.send({ 
          success: true,
          user: {
            id: alreadyExists._id,
            name: userData.name || alreadyExists.name,
            email: alreadyExists.email,
            photoURL: userData.image || userData.photoURL || alreadyExists.photoURL,
            role: alreadyExists.role
          }
        });
      }

      console.log('Saving new user info......');
      const result = await usersCollection.insertOne(userData);
      res.send({ 
        success: true,
        user: {
          id: result.insertedId,
          name: userData.name,
          email: userData.email,
          photoURL: userData.image || userData.photoURL,
          role: userData.role
        }
      });
    });

    // Get current user info
    app.get('/api/auth/me', verifyJWT, async (req, res) => {
      const user = await usersCollection.findOne({ uid: req.tokenUid });
      if (!user) return res.status(404).send({ message: 'User not found' });
      res.send({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role
        }
      });
    });

    // Get all users (admin only)
    app.get('/api/users', verifyJWT, verifyADMIN, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send({ success: true, users });
    });

    // Update user role (admin only)
    app.patch('/api/users/:id/role', verifyJWT, verifyADMIN, async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send({ success: true, result });
    });

    // Update user profile
    app.patch('/api/users/:id', verifyJWT, async (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
      res.send({ success: true, result });
    });

    // ==================== BOOK ROUTES ====================
    
    // Get all books
    app.get('/api/books', async (req, res) => {
      const { search, sort, category } = req.query;
      let query = {};
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category && category !== 'all') {
        query.category = category;
      }

      let sortOption = {};
      if (sort === 'newest') sortOption = { createdAt: -1 };
      else if (sort === 'oldest') sortOption = { createdAt: 1 };
      else if (sort === 'title') sortOption = { title: 1 };

      const books = await booksCollection.find(query).sort(sortOption).toArray();
      res.send({ success: true, books });
    });

    // Get single book
    app.get('/api/books/:id', async (req, res) => {
      const book = await booksCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!book) return res.status(404).send({ message: 'Book not found' });
      res.send({ success: true, book });
    });

    // Add book (librarian only)
    app.post('/api/books', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const bookData = { ...req.body, createdAt: new Date().toISOString() };
      const result = await booksCollection.insertOne(bookData);
      res.send({ success: true, result });
    });

    // Update book (librarian only)
    app.patch('/api/books/:id', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send({ success: true, result });
    });

    // Delete book (librarian/admin only)
    app.delete('/api/books/:id', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const result = await booksCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send({ success: true, result });
    });

    // ==================== ORDER ROUTES ====================
    
    // Create order
    app.post('/api/orders', verifyJWT, async (req, res) => {
      const orderData = { 
        ...req.body, 
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      const result = await ordersCollection.insertOne(orderData);
      res.send({ success: true, result });
    });

    // Get user orders
    app.get('/api/orders/user/:userId', verifyJWT, async (req, res) => {
      const orders = await ordersCollection.find({ userId: req.params.userId }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, orders });
    });

    // Get librarian orders
    app.get('/api/orders/librarian/:librarianId', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const orders = await ordersCollection.find({ librarianId: req.params.librarianId }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, orders });
    });

    // Update order status
    app.patch('/api/orders/:id/status', verifyJWT, async (req, res) => {
      const { status } = req.body;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status, updatedAt: new Date().toISOString() } }
      );
      res.send({ success: true, result });
    });

    // ==================== WISHLIST ROUTES ====================
    
    // Get user wishlist
    app.get('/api/wishlist/:userId', verifyJWT, async (req, res) => {
      const wishlist = await wishlistCollection.find({ userId: req.params.userId }).toArray();
      res.send({ success: true, wishlist });
    });

    // Add to wishlist
    app.post('/api/wishlist', verifyJWT, async (req, res) => {
      const wishlistData = { ...req.body, createdAt: new Date().toISOString() };
      const result = await wishlistCollection.insertOne(wishlistData);
      res.send({ success: true, result });
    });

    // Remove from wishlist
    app.delete('/api/wishlist/:id', verifyJWT, async (req, res) => {
      const result = await wishlistCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send({ success: true, result });
    });

    // ==================== REVIEW ROUTES ====================
    
    // Get book reviews
    app.get('/api/reviews/:bookId', async (req, res) => {
      const reviews = await reviewsCollection.find({ bookId: req.params.bookId }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, reviews });
    });

    // Add review
    app.post('/api/reviews', verifyJWT, async (req, res) => {
      const reviewData = { ...req.body, createdAt: new Date().toISOString() };
      const result = await reviewsCollection.insertOne(reviewData);
      res.send({ success: true, result });
    });

    // ==================== PAYMENT ROUTES ====================
    
    // Create payment intent
    app.post('/api/payment/create-intent', verifyJWT, async (req, res) => {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        payment_method_types: ['card'],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // Confirm payment
    app.post('/api/payment/confirm', verifyJWT, async (req, res) => {
      const { orderId, paymentIntentId } = req.body;
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { paymentStatus: 'paid', paymentIntentId, paidAt: new Date().toISOString() } }
      );
      res.send({ success: true, result });
    });

    // Root route
    app.get('/', (req, res) => {
      res.json({ 
        success: true, 
        message: '🚀 BookNest Server is running!',
        version: '2.0.0'
      });
    });

    console.log('✅ MongoDB Connected');
  } finally {
    // Keep connection open
  }
}

run().catch(console.dir);

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🌐 Client: ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
});
