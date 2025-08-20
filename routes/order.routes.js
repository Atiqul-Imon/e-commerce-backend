import express from 'express'
import {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getAllOrders
} from '../controllers/order.controller.js'
import { protect, admin } from '../middleware/auth.middleware.js'
import { body, param } from 'express-validator'
import { validateRequest } from '../middleware/validateRequest.js'

const router = express.Router()

// Validation rules
const createOrderValidation = [
  // For authenticated users, cart items are fetched automatically
  // For guest checkout, items are required in request body
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array for guest checkout'),
  
  body('shippingAddress')
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('shippingAddress.street')
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('State/Division is required')
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('shippingAddress.postalCode')
    .notEmpty()
    .withMessage('Postal code is required')
    .isLength({ max: 10 })
    .withMessage('Postal code cannot exceed 10 characters'),
  body('shippingAddress.phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Invalid Bangladeshi phone number format (01XXXXXXXXX)'),
  
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('paymentMethod.type')
    .isIn(['cash_on_delivery', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'card'])
    .withMessage('Invalid payment method'),
  
  // Guest checkout specific validation
  body('customerInfo')
    .if(body('items').exists())
    .notEmpty()
    .withMessage('Customer information is required for guest checkout'),
  body('customerInfo.name')
    .if(body('items').exists())
    .notEmpty()
    .withMessage('Customer name is required for guest checkout')
    .isLength({ max: 100 })
    .withMessage('Customer name cannot exceed 100 characters'),
  body('customerInfo.email')
    .if(body('items').exists())
    .isEmail()
    .withMessage('Valid email is required for guest checkout')
    .normalizeEmail(),
  body('customerInfo.phone')
    .if(body('items').exists())
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Invalid Bangladeshi phone number format for guest checkout'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('promoCode')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Promo code cannot exceed 20 characters'),
  body('deliverySlot')
    .optional()
    .isIn(['morning', 'afternoon', 'evening', 'anytime'])
    .withMessage('Invalid delivery slot')
]

const updateOrderStatusValidation = [
  body('orderStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'awaiting_payment', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  body('trackingNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Tracking number cannot exceed 50 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
]

const cancelOrderValidation = [
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason cannot exceed 200 characters')
]

const orderIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Order ID is required')
]

// Public routes (guest checkout)
// @route   POST /api/orders
// @desc    Create new order (authenticated users or guest checkout)
// @access  Public/Private
router.post('/', createOrderValidation, validateRequest, createOrder)

// @route   GET /api/orders/:id
// @desc    Get single order (public access with order number)
// @access  Public/Private
router.get('/:id', orderIdValidation, validateRequest, getOrder)

// Protected routes (require authentication)
router.use(protect)

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', getUserOrders)

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', [
  ...orderIdValidation,
  ...cancelOrderValidation
], validateRequest, cancelOrder)

// Admin routes
// @route   GET /api/orders/admin/all
// @desc    Get all orders (admin only)
// @access  Private/Admin
router.get('/admin/all', admin, getAllOrders)

// @route   GET /api/orders/admin/stats
// @desc    Get order statistics (admin only)
// @access  Private/Admin
router.get('/admin/stats', admin, getOrderStats)

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private/Admin
router.put('/:id/status', admin, [
  ...orderIdValidation,
  ...updateOrderStatusValidation
], validateRequest, updateOrderStatus)

export default router