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

// ── Admin: All Orders ─────────────────────────────────────────────────────────

const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({}).sort({ date: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Update Order Status ────────────────────────────────────────────────

const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;
  try {
    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Analytics ──────────────────────────────────────────────────────────

const getAnalytics = async (req, res) => {
  try {
    const orders = await orderModel.find({ payment: true }).sort({ date: 1 });

    // Revenue by day (last 14 days)
    const now = new Date();
    const revenueByDay = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const dayOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d >= day && d < nextDay;
      });

      revenueByDay.push({
        date: day.toISOString().split('T')[0],
        revenue: dayOrders.reduce((s, o) => s + o.amount, 0),
        count: dayOrders.length,
      });
    }

    // Orders by status (all orders)
    const allOrders = await orderModel.find({});
    const statusMap = {};
    allOrders.forEach(o => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Top 5 items by quantity sold
    const itemMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({ success: true, data: { revenueByDay, ordersByStatus, topItems } });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { placeOrder, verifyOrder, userOrders, getAllOrders, updateOrderStatus, getAnalytics };
