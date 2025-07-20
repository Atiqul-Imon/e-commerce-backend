import express from 'express'
import {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} from '../controllers/order.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

// @route   POST /api/orders
router.post('/', createOrder)

// @route   GET /api/orders
router.get('/', getUserOrders)

// @route   GET /api/orders/:id
router.get('/:id', getOrder)

// @route   PUT /api/orders/:id/cancel
router.put('/:id/cancel', cancelOrder)

// Admin only routes
// @route   PUT /api/orders/:id/status
router.put('/:id/status', authorize('admin'), updateOrderStatus)

// @route   GET /api/orders/stats
router.get('/stats', authorize('admin'), getOrderStats)

export default router 