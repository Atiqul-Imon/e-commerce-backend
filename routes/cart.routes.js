import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/cart
router.get('/', getCart);

// @route   POST /api/cart/add
router.post('/add', addToCart);

// @route   PUT /api/cart/update/:itemId
router.put('/update/:itemId', updateCartItem);

// @route   DELETE /api/cart/remove/:itemId
router.delete('/remove/:itemId', removeFromCart);

// @route   DELETE /api/cart/clear
router.delete('/clear', clearCart);

export default router; 