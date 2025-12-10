const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

/**
 * Create payment intent
 * POST /api/payment/create-intent
 */
router.post('/create-intent', verifyFirebaseToken, async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: orderId || 'direct_purchase',
        userId: req.user.id
      }
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

/**
 * Confirm payment and update order
 * POST /api/payment/confirm
 */
router.post('/confirm', verifyFirebaseToken, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }
    
    // Update order payment status
    if (orderId) {
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
      
      // Create payment record
      await Payment.create({
        user: req.user.id,
        order: orderId,
        amount: paymentIntent.amount / 100,
        paymentMethod: 'stripe',
        transactionId: paymentIntentId,
        paymentStatus: 'completed'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      paymentIntent
    });
  } catch (error) {
    console.error('Payment Confirmation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

/**
 * Get payment history for user
 * GET /api/payment/history
 */
router.get('/history', verifyFirebaseToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('order')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

/**
 * Get single payment/invoice
 * GET /api/payment/:id
 */
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user')
      .populate({
        path: 'order',
        populate: { path: 'book' }
      });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Ensure user can only access their own payments
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details'
    });
  }
});

/**
 * Webhook for Stripe events
 * POST /api/payment/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Update order status
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
