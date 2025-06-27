
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { addToCart, getCart, removeFromCart, updateCartQuantity } from '../controllers/cartController.js';

const cartRouter = express.Router();

cartRouter.post('/add', authMiddleware, addToCart);
cartRouter.post('/remove', authMiddleware, removeFromCart);
cartRouter.get('/get', authMiddleware, getCart);
cartRouter.put('/update', authMiddleware, updateCartQuantity);

export default cartRouter;
