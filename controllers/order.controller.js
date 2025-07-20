import Order from '../models/Order.model.js'
import Cart from '../models/Cart.model.js'
import Product from '../models/product.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    total,
    paymentStatus = 'pending',
    orderStatus = 'processing'
  } = req.body

  // Validate required fields
  if (!items || !shippingAddress || !paymentMethod || !total) {
    throw new ApiError(400, 'Missing required order information')
  }

  // Validate items and check stock
  for (const item of items) {
    const product = await Product.findById(item.product)
    if (!product) {
      throw new ApiError(404, `Product ${item.product} not found`)
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`)
    }
  }

  // Create order
  const order = await Order.create({
    user: req.user.id,
    items,
    shippingAddress,
    paymentMethod: {
      type: 'card',
      cardLast4: paymentMethod.cardNumber.slice(-4),
      cardBrand: getCardBrand(paymentMethod.cardNumber)
    },
    total,
    paymentStatus,
    orderStatus
  })

  // Update product stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity }
    })
  }

  // Clear user's cart after successful order
  await Cart.findOneAndUpdate(
    { user: req.user.id },
    { items: [] }
  )

  // Populate product details
  await order.populate({
    path: 'items.product',
    select: 'name price images category'
  })

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    order
  })
})

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
export const getUserOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query

  const query = { user: req.user.id }
  if (status) {
    query.orderStatus = status
  }

  const orders = await Order.find(query)
    .populate({
      path: 'items.product',
      select: 'name price images category'
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await Order.countDocuments(query)

  res.status(200).json({
    success: true,
    orders,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total
    }
  })
})

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate({
    path: 'items.product',
    select: 'name price images category description'
  })

  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  res.status(200).json({
    success: true,
    order
  })
})

// @desc    Update order status (admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderStatus, paymentStatus } = req.body

  const order = await Order.findById(req.params.id)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  if (orderStatus) {
    order.orderStatus = orderStatus
  }
  if (paymentStatus) {
    order.paymentStatus = paymentStatus
  }

  await order.save()

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    order
  })
})

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  })

  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  // Only allow cancellation if order is still processing
  if (order.orderStatus !== 'processing') {
    throw new ApiError(400, 'Order cannot be cancelled at this stage')
  }

  order.orderStatus = 'cancelled'
  await order.save()

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    })
  }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    order
  })
})

// @desc    Get order statistics (admin only)
// @route   GET /api/orders/stats
// @access  Private/Admin
export const getOrderStats = asyncHandler(async (req, res, next) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' }
      }
    }
  ])

  const statusStats = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 }
      }
    }
  ])

  res.status(200).json({
    success: true,
    stats: stats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
    statusStats
  })
})

// Helper function to determine card brand
function getCardBrand(cardNumber) {
  const cleanNumber = cardNumber.replace(/\s/g, '')
  
  if (/^4/.test(cleanNumber)) return 'visa'
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard'
  if (/^3[47]/.test(cleanNumber)) return 'amex'
  if (/^6/.test(cleanNumber)) return 'discover'
  
  return 'unknown'
} 