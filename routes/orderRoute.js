import express from 'express';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';
import { placeOrder, userOrders, verifyOrder, getAllOrders, updateOrderStatus, getAnalytics } from '../controllers/orderController.js';

const orderRouter = express.Router();

// User routes
orderRouter.post('/place', authMiddleware, placeOrder);
orderRouter.post('/verify', verifyOrder);
orderRouter.post('/userorders', authMiddleware, userOrders);

// Admin routes
orderRouter.get('/all', adminMiddleware, getAllOrders);
orderRouter.post('/status', adminMiddleware, updateOrderStatus);
orderRouter.get('/analytics', adminMiddleware, getAnalytics);

export default orderRouter;
