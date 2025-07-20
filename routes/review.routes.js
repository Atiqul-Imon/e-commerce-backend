import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/reviews
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Get all reviews'
  });
});

// @route   POST /api/reviews
router.post('/', protect, (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Review created successfully'
  });
});

// @route   GET /api/reviews/:id
router.get('/:id', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Get review by ID'
  });
});

// @route   PUT /api/reviews/:id
router.put('/:id', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Review updated successfully'
  });
});

// @route   DELETE /api/reviews/:id
router.delete('/:id', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

export default router; 