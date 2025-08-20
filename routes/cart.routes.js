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
import { body } from 'express-validator'
import { validateRequest } from '../middleware/validateRequest.js'

const router = express.Router()

// Validation rules
const addToCartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('selectedColor')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Selected color must be a string with max 50 characters'),
  body('selectedSize')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Selected size must be a string with max 20 characters')
]

const updateCartItemValidation = [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
]

const syncGuestCartValidation = [
  body('guestCartItems')
    .isArray()
    .withMessage('Guest cart items must be an array'),
  body('guestCartItems.*.productId')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('guestCartItems.*._id')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('guestCartItems.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
]

// All cart routes require authentication
router.use(protect)

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', getCart)

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', addToCartValidation, validateRequest, addToCart)

// @route   PUT /api/cart/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/:itemId', updateCartItemValidation, validateRequest, updateCartItem)

// @route   DELETE /api/cart/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/:itemId', removeFromCart)

// @route   DELETE /api/cart
// @desc    Clear cart
// @access  Private
router.delete('/', clearCart)

// @route   POST /api/cart/sync
// @desc    Sync guest cart with user cart
// @access  Private
router.post('/sync', syncGuestCartValidation, validateRequest, syncGuestCart)

// @route   POST /api/cart/validate
// @desc    Validate cart items before checkout
// @access  Private
router.post('/validate', validateCart)

export default router