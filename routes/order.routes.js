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
import {
  validateCreateOrder,
  validateMongoId,
  validatePagination
} from '../middleware/validation.middleware.js'

const router = express.Router()

// Public routes (guest checkout)
// @route   POST /api/orders
// @desc    Create new order (authenticated users or guest checkout)
// @access  Public/Private
router.post('/', validateCreateOrder, createOrder)

// @route   GET /api/orders/:id
// @desc    Get single order (public access with order number)
// @access  Public/Private
router.get('/:id', validateMongoId, getOrder)

// Protected routes (require authentication)
router.use(protect)

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', validatePagination, getUserOrders)

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', validateMongoId, cancelOrder)

// Admin routes
// @route   GET /api/orders/admin/all
// @desc    Get all orders (admin only)
// @access  Private/Admin
router.get('/admin/all', admin, validatePagination, getAllOrders)

// @route   GET /api/orders/admin/stats
// @desc    Get order statistics (admin only)
// @access  Private/Admin
router.get('/admin/stats', admin, getOrderStats)

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private/Admin
router.put('/:id/status', admin, validateMongoId, updateOrderStatus)

export default router