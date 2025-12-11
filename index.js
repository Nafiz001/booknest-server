require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const PORT = process.env.PORT || 5000;

// Initialize Firebase Admin
let firebaseInitialized = false;
try {
  const serviceKey = process.env.FB_SERVICE_KEY || process.env.FIREBASE_SERVICE_KEY_BASE64;
  if (!serviceKey) {
    throw new Error('No Firebase service key found in environment');
  }
  const decoded = Buffer.from(serviceKey, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(decoded);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  // Don't throw - let the app start but return errors on protected routes
}

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://booknest-client-jet.vercel.app',
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// JWT middleware
const verifyJWT = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(' ')[1];
    console.log('🔐 Token received:', token ? 'Yes' : 'No');
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized Access!' });
    }
    
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('✅ Token verified for:', decoded.email);
    req.tokenEmail = decoded.email;
    req.tokenUid = decoded.uid;
    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.code || err.message);
    return res.status(401).json({ 
      message: 'Unauthorized Access!', 
      error: err.message,
      code: err.code 
    });
  }
};

// Test endpoint to check Firebase Admin initialization
app.get('/api/firebase-test', (req, res) => {
  try {
    const app = admin.app();
    res.json({ 
      success: true, 
      message: 'Firebase Admin is initialized',
      hasCredential: !!app.options.credential
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Firebase Admin not initialized',
      error: error.message 
    });
  }
});

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
      else if (sort === 'price-asc') sortOption = { price: 1 };
      else if (sort === 'price-desc') sortOption = { price: -1 };

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
      const user = await usersCollection.findOne({ uid: req.tokenUid });
      const bookData = { 
        ...req.body, 
        librarianId: user._id.toString(),
        librarianEmail: user.email,
        librarianName: user.name,
        published: req.body.published !== undefined ? req.body.published : true,
        createdAt: new Date().toISOString() 
      };
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
      // Also delete all orders for this book
      await ordersCollection.deleteMany({ bookId: req.params.id });
      res.send({ success: true, result });
    });

    // Admin: Get all books from all librarians
    app.get('/api/admin/books', verifyJWT, verifyADMIN, async (req, res) => {
      const books = await booksCollection.find().sort({ createdAt: -1 }).toArray();
      res.send({ success: true, books });
    });

    // Admin: Toggle book publish status
    app.patch('/api/admin/books/:id/publish', verifyJWT, verifyADMIN, async (req, res) => {
      const { published } = req.body;
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { published } }
      );
      res.send({ success: true, result });
    });

    // Librarian: Get books added by specific librarian
    app.get('/api/books/librarian/:librarianId', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const books = await booksCollection.find({ 
        librarianId: req.params.librarianId 
      }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, books });
    });

    // ==================== ORDER ROUTES ====================
    
    // Create order
    app.post('/api/orders', verifyJWT, async (req, res) => {
      const orderData = { 
        ...req.body,
        userId: req.body.userId.toString(), // Ensure userId is string for consistent querying
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      const result = await ordersCollection.insertOne(orderData);
      res.send({ success: true, result, orderId: result.insertedId });
    });

    // Get user orders
    app.get('/api/orders/user/:userId', verifyJWT, async (req, res) => {
      const orders = await ordersCollection.find({ userId: req.params.userId }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, orders });
    });

    // Check if user ordered a specific book
    app.get('/api/orders/user/:userId/book/:bookId', verifyJWT, async (req, res) => {
      const order = await ordersCollection.findOne({ 
        userId: req.params.userId,
        bookId: req.params.bookId
      });
      res.send({ success: true, hasOrdered: !!order });
    });

    // Get librarian orders
    app.get('/api/orders/librarian/:librarianId', verifyJWT, verifyLIBRARIAN, async (req, res) => {
      const orders = await ordersCollection.find({ librarianId: req.params.librarianId }).sort({ createdAt: -1 }).toArray();
      res.send({ success: true, orders });
    });

    // Update order status
    app.patch('/api/orders/:id/status', verifyJWT, async (req, res) => {
      const { status } = req.body;
      await ordersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status, updatedAt: new Date().toISOString() } }
      );
      const order = await ordersCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send({ success: true, order });
    });

    // Cancel order (change status to cancelled)
    app.delete('/api/orders/:id', verifyJWT, async (req, res) => {
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
      );
      res.send({ success: true, result });
    });

    // ==================== WISHLIST ROUTES ====================
    
    // Get user wishlist with book details
    app.get('/api/wishlist/:userId', verifyJWT, async (req, res) => {
      try {
        const wishlistItems = await wishlistCollection.find({ userId: req.params.userId }).toArray();
        
        // Populate book details for each wishlist item
        const wishlistWithBooks = await Promise.all(
          wishlistItems.map(async (item) => {
            const book = await booksCollection.findOne({ _id: new ObjectId(item.bookId) });
            return {
              ...item,
              book: book || null
            };
          })
        );
        
        // Filter out items where book no longer exists
        const validWishlist = wishlistWithBooks.filter(item => item.book !== null);
        
        res.send({ success: true, wishlist: validWishlist });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Failed to fetch wishlist' });
      }
    });

    // Add to wishlist
    app.post('/api/wishlist', verifyJWT, async (req, res) => {
      try {
        const { bookId } = req.body;
        const userId = req.tokenUid;
        
        // Find user to get their ID
        const user = await usersCollection.findOne({ uid: userId });
        if (!user) return res.status(404).send({ success: false, message: 'User not found' });
        
        // Check if book exists
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        if (!book) return res.status(404).send({ success: false, message: 'Book not found' });
        
        // Check if already in wishlist
        const existing = await wishlistCollection.findOne({ 
          userId: user._id.toString(), 
          bookId: bookId 
        });
        
        if (existing) {
          return res.status(409).send({ success: false, message: 'Book already in wishlist' });
        }
        
        const wishlistData = { 
          userId: user._id.toString(),
          bookId: bookId,
          createdAt: new Date().toISOString() 
        };
        
        const result = await wishlistCollection.insertOne(wishlistData);
        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Failed to add to wishlist' });
      }
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
      const user = await usersCollection.findOne({ uid: req.tokenUid });
      const reviewData = { 
        ...req.body,
        userId: user._id.toString(),
        userName: user.name,
        userEmail: req.tokenEmail,
        createdAt: new Date().toISOString() 
      };
      const result = await reviewsCollection.insertOne(reviewData);
      
      // Update book's rating and review count
      const bookId = new ObjectId(req.body.bookId);
      const allReviews = await reviewsCollection.find({ bookId: req.body.bookId }).toArray();
      const avgRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
      
      await booksCollection.updateOne(
        { _id: bookId },
        { 
          $set: { 
            rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            reviews: allReviews.length 
          } 
        }
      );
      
      res.send({ success: true, result });
    });

    // ==================== INVOICE ROUTES ====================
    
    // Get user invoices (paid orders)
    app.get('/api/invoices/:userId', verifyJWT, async (req, res) => {
      try {
        const invoices = await ordersCollection.find({ 
          userId: req.params.userId,
          paymentStatus: 'paid'
        }).sort({ paidAt: -1 }).toArray();
        res.send({ success: true, invoices });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Failed to fetch invoices' });
      }
    });

    // Get single invoice
    app.get('/api/invoices/detail/:orderId', verifyJWT, async (req, res) => {
      try {
        const invoice = await ordersCollection.findOne({ _id: new ObjectId(req.params.orderId) });
        if (!invoice) return res.status(404).send({ success: false, message: 'Invoice not found' });
        res.send({ success: true, invoice });
      } catch (error) {
        res.status(500).send({ success: false, message: 'Failed to fetch invoice' });
      }
    });

    // ==================== PAYMENT ROUTES ====================
    
    // Create checkout session
    // Payment endpoint - NO JWT verification (validated by order existence)
    app.post('/api/create-checkout-session', async (req, res) => {
      try {
        const { order } = req.body;
        
        // Validate order exists in database
        const existingOrder = await ordersCollection.findOne({ 
          _id: new ObjectId(order._id) 
        });
        
        if (!existingOrder) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        // Validate email matches
        if (existingOrder.email !== order.email) {
          return res.status(403).json({ message: 'Unauthorized' });
        }
        
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: order.bookTitle,
                  description: `Order for ${order.bookTitle}`,
                  images: [order.bookImage],
                },
                unit_amount: Math.round(order.bookPrice * 100),
              },
              quantity: 1,
            },
          ],
          customer_email: order.email,
          mode: 'payment',
          metadata: {
            orderId: order._id.toString(),
            customer: order.email,
          },
          success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/my-orders`,
        });
        
        res.send({ url: session.url });
      } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ message: 'Payment failed', error: error.message });
      }
    });

    // Payment success webhook
    app.post('/api/payment-success', async (req, res) => {
      const { sessionId } = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.status === 'complete') {
        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(session.metadata.orderId) },
          { 
            $set: { 
              paymentStatus: 'paid', 
              transactionId: session.payment_intent,
              paidAt: new Date().toISOString() 
            } 
          }
        );
        res.send({ success: true, result });
      } else {
        res.status(400).send({ success: false, message: 'Payment not completed' });
      }
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

app.get('/', (req, res) => {
  res.send('BookNest Server is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
