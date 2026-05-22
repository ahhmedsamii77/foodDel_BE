import Stripe from 'stripe';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── Place Order ───────────────────────────────────────────────────────────────

const placeOrder = async (req, res) => {
  const frontEndUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const newOrder = new orderModel({
      userId: req.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });
    await newOrder.save();

    // Clear user cart after order
    await userModel.findByIdAndUpdate(req.userId, { cartData: {} });

    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency: 'egp',
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    // Delivery charge: 50 EGP
    line_items.push({
      price_data: {
        currency: 'egp',
        product_data: { name: 'Delivery Charges' },
        unit_amount: 5000,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${frontEndUrl}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontEndUrl}/verify?success=false&orderId=${newOrder._id}`,
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.error('placeOrder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing order' });
  }
};

// ── Verify Order ──────────────────────────────────────────────────────────────

const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    if (success === 'true') {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      res.json({ success: true, message: 'Payment confirmed' });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false, message: 'Payment cancelled — order removed' });
    }
  } catch (error) {
    console.error('verifyOrder error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── User Orders ───────────────────────────────────────────────────────────────

const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.userId }).sort({ date: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('userOrders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { placeOrder, verifyOrder, userOrders };
