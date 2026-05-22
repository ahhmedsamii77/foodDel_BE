import express from 'express';
import { addFood, listFood, removeFood } from '../controllers/foodController.js';
import multer from 'multer';

const foodRouter = express.Router();

// Use memory storage — Vercel has a read-only filesystem, diskStorage would crash
const upload = multer({ storage: multer.memoryStorage() });

foodRouter.post('/add', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    next();
  });
}, addFood);

foodRouter.get('/list', listFood);
foodRouter.post('/remove', removeFood);

export default foodRouter;