import express from 'express';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/payments/create-payment-intent
router.post('/create-payment-intent', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment intent created'
  });
});

// @route   POST /api/payments/confirm
router.post('/confirm', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment confirmed'
  });
});

// @route   GET /api/payments/history
router.get('/history', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment history'
  });
});

export default router; 