import express from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncGuestCart,
  validateCart
} from '../controllers/cart.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import {
  validateAddToCart,
  validateUpdateCartItem,
  validateMongoId
} from '../middleware/validation.middleware.js'

const router = express.Router()

// All cart routes require authentication
router.use(protect)

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', getCart)

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', validateAddToCart, addToCart)

// @route   PUT /api/cart/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/:itemId', validateUpdateCartItem, updateCartItem)

// @route   DELETE /api/cart/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/:itemId', validateMongoId, removeFromCart)

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete('/', clearCart)

// @route   POST /api/cart/sync
// @desc    Sync guest cart with user cart
// @access  Private
router.post('/sync', validateAddToCart, syncGuestCart)

// @route   POST /api/cart/validate
// @desc    Validate cart items before checkout
// @access  Private
router.post('/validate', validateCart)

export default router