import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/categories
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Get all categories'
  });
});

// @route   POST /api/categories
router.post('/', protect, authorize('admin'), (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Category created successfully'
  });
});

// @route   GET /api/categories/:id
router.get('/:id', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Get category by ID'
  });
});

// @route   PUT /api/categories/:id
router.put('/:id', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Category updated successfully'
  });
});

// @route   DELETE /api/categories/:id
router.delete('/:id', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

export default router; 