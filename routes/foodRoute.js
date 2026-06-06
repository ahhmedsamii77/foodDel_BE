import express from 'express';
import { addFood, listFood, removeFood, getFoodById } from '../controllers/foodController.js';
import adminMiddleware from '../middleware/admin.js';
import multer from 'multer';

const foodRouter = express.Router();

// Use memory storage — Vercel has a read-only filesystem
const upload = multer({ storage: multer.memoryStorage() });

// Public
foodRouter.get('/list', listFood);
foodRouter.get('/:id', getFoodById);

// Admin only
foodRouter.post('/add', adminMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    next();
  });
}, addFood);

foodRouter.post('/remove', adminMiddleware, removeFood);

export default foodRouter;