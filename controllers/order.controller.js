import Order from '../models/Order.model.js'
import Cart from '../models/Cart.model.js'
import Product from '../models/product.model.js'
import User from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../utils/emailService.js'
import { sendSMS } from '../utils/smsService.js'

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ARZ${timestamp}${random}`
}

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Public (for guest checkout)
export const createOrder = asyncHandler(async (req, res) => {
  const {
    items, // For guest checkout, items come from request
    shippingAddress,
    billingAddress,
    paymentMethod,
    customerInfo, // For guest checkout
    notes,
    promoCode
  } = req.body

  let orderItems = []
  let user = null

  // Handle authenticated user vs guest checkout
  if (req.user) {
    // Authenticated user - get items from cart
    user = req.user.id
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product')
    
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty')
    }
    
    orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      originalPrice: item.product.originalPrice,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      image: item.product.images[0]
    }))
  } else {
    // Guest checkout - validate items from request
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Order items are required for guest checkout')
    }
    
    if (!customerInfo || !customerInfo.email || !customerInfo.name) {
      throw new ApiError(400, 'Customer information is required for guest checkout')
    }
    
    // Validate each item
    for (const item of items) {
      // For guest cart, we need to use the actual product ID, not the temporary guest ID
      let productId = item.productId || item._id
      
      // If it's a guest cart item with a temporary ID, use the product._id instead
      if (item.product && item.product._id) {
        productId = item.product._id
      }
      
      // Validate that we have a proper MongoDB ObjectId
      if (!productId || typeof productId !== 'string' || productId.length !== 24) {
        throw new ApiError(400, `Invalid product ID: ${productId}`)
      }
      
      const product = await Product.findById(productId)
      if (!product || !product.isActive) {
        throw new ApiError(404, `Product ${item.name || productId} not found or inactive`)
      }
      
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}. Only ${product.stock} available`)
      }
      
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        originalPrice: product.originalPrice,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        image: product.images[0]
      })
    }
  }

  // Validate required fields
  if (!shippingAddress || !paymentMethod) {
    throw new ApiError(400, 'Shipping address and payment method are required')
  }

  // Calculate totals
  const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  const freeShippingThreshold = 1000
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 60
  const tax = 0 // No tax for now
  let discount = 0

  // Apply promo code if provided
  if (promoCode) {
    // Simple promo code logic - can be enhanced
    if (promoCode === 'WELCOME10') {
      discount = subtotal * 0.1 // 10% discount
    } else if (promoCode === 'FLAT50') {
      discount = 50 // Flat ৳50 discount
    }
  }

  const totalAmount = subtotal + shippingCost + tax - discount

  // Validate payment method for Bangladeshi market
  const validPaymentMethods = [
    'cash_on_delivery',
    'bkash',
    'nagad',
    'rocket',
    'bank_transfer',
    'card'
  ]
  
  if (!validPaymentMethods.includes(paymentMethod.type)) {
    throw new ApiError(400, 'Invalid payment method')
  }

  // Create order
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: user,
    customerInfo: !user ? customerInfo : undefined,
    items: orderItems,
    shippingAddress: {
      ...shippingAddress,
      country: shippingAddress.country || 'Bangladesh'
    },
    billingAddress: billingAddress || shippingAddress,
    paymentMethod: {
      type: paymentMethod.type,
      ...paymentMethod
    },
    subtotal,
    shippingCost,
    tax,
    discount,
    totalAmount,
    orderStatus: 'pending',
    paymentStatus: paymentMethod.type === 'cash_on_delivery' ? 'pending' : 'awaiting_payment',
    notes,
    promoCode,
    // Bangladeshi specific fields
    estimatedDelivery: calculateEstimatedDelivery(shippingAddress.city),
    deliverySlot: req.body.deliverySlot || 'anytime'
  })

  // Update product stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity }
    })
  }

  // Clear user's cart if authenticated
  if (user) {
    await Cart.findOneAndUpdate(
      { user: user },
      { items: [] }
    )
  }

  // Populate order details
  await order.populate([
    {
      path: 'items.product',
      select: 'name price images category'
    },
    {
      path: 'user',
      select: 'name email phone'
    }
  ])

  // Send confirmation notifications
  try {
    const customerEmail = user ? order.user.email : customerInfo.email
    const customerPhone = user ? order.user.phone : customerInfo.phone
    const customerName = user ? order.user.name : customerInfo.name

    // Send email confirmation
    if (customerEmail) {
      await sendOrderConfirmationEmail(customerEmail, order, customerName)
    }

    // Send SMS confirmation (for Bangladeshi market)
    if (customerPhone) {
      const smsMessage = `আপনার অর্ডার ${order.orderNumber} সফলভাবে গ্রহণ করা হয়েছে। মোট: ৳${totalAmount}। ট্র্যাক করুন: ${process.env.FRONTEND_URL}/orders/${order._id}`
      await sendSMS(customerPhone, smsMessage)
    }
  } catch (notificationError) {
    console.error('Error sending notifications:', notificationError)
    // Don't fail the order creation if notifications fail
  }

  return res.status(201).json(
    new ApiResponse(201, order, 'Order created successfully')
  )
})

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
export const getUserOrders = asyncHandler(async (req, res) => {
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

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
        hasPrevPage: parseInt(page) > 1
      }
    }, 'Orders retrieved successfully')
  )
})

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private/Public (with order number)
export const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params
  
  let query = {}
  
  // Check if it's an order ID or order number
  if (id.startsWith('ARZ')) {
    query = { orderNumber: id }
  } else {
    query = { _id: id }
    // If authenticated user, ensure they can only access their orders
    if (req.user) {
      query.user = req.user.id
    }
  }

  const order = await Order.findOne(query).populate([
    {
      path: 'items.product',
      select: 'name price images category description'
    },
    {
      path: 'user',
      select: 'name email phone'
    }
  ])

  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  return res.status(200).json(
    new ApiResponse(200, order, 'Order retrieved successfully')
  )
})

// @desc    Update order status (admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus, trackingNumber, notes } = req.body

  const order = await Order.findById(req.params.id).populate('user', 'name email phone')
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  const previousStatus = order.orderStatus

  // Update order fields
  if (orderStatus) {
    order.orderStatus = orderStatus
    
    // Set delivery date when order is delivered
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date()
    }
  }
  
  if (paymentStatus) {
    order.paymentStatus = paymentStatus
    
    if (paymentStatus === 'paid') {
      order.paidAt = new Date()
    }
  }
  
  if (trackingNumber) {
    order.trackingNumber = trackingNumber
  }
  
  if (notes) {
    order.adminNotes = notes
  }

  await order.save()

  // Send notifications if status changed
  if (orderStatus && orderStatus !== previousStatus) {
    try {
      const customerEmail = order.user ? order.user.email : order.customerInfo?.email
      const customerPhone = order.user ? order.user.phone : order.customerInfo?.phone
      const customerName = order.user ? order.user.name : order.customerInfo?.name

      // Send email update
      if (customerEmail) {
        await sendOrderStatusUpdateEmail(customerEmail, order, customerName)
      }

      // Send SMS update (in Bengali for Bangladeshi market)
      if (customerPhone) {
        const statusMessages = {
          confirmed: `আপনার অর্ডার ${order.orderNumber} নিশ্চিত করা হয়েছে। শীঘ্রই প্রসেসিং শুরু হবে।`,
          processing: `আপনার অর্ডার ${order.orderNumber} প্রসেসিং এ আছে। পণ্য প্রস্তুত করা হচ্ছে।`,
          shipped: `আপনার অর্ডার ${order.orderNumber} পাঠানো হয়েছে। ট্র্যাকিং: ${trackingNumber || 'শীঘ্রই'}`,
          delivered: `আপনার অর্ডার ${order.orderNumber} সফলভাবে ডেলিভার হয়েছে। আরিজানের সাথে কেনাকাটার জন্য ধন্যবাদ!`,
          cancelled: `আপনার অর্ডার ${order.orderNumber} বাতিল করা হয়েছে। অর্থ ফেরত দেওয়া হবে।`
        }
        
        const smsMessage = statusMessages[orderStatus] || `আপনার অর্ডার ${order.orderNumber} এর স্ট্যাটাস আপডেট হয়েছে: ${orderStatus}`
        await sendSMS(customerPhone, smsMessage)
      }
    } catch (notificationError) {
      console.error('Error sending status update notifications:', notificationError)
    }
  }

  return res.status(200).json(
    new ApiResponse(200, order, 'Order status updated successfully')
  )
})

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body
  
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  })

  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  // Only allow cancellation for certain statuses
  const cancellableStatuses = ['pending', 'confirmed', 'processing']
  if (!cancellableStatuses.includes(order.orderStatus)) {
    throw new ApiError(400, 'Order cannot be cancelled at this stage')
  }

  order.orderStatus = 'cancelled'
  order.cancelledAt = new Date()
  order.cancellationReason = reason || 'Cancelled by customer'
  
  await order.save()

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    })
  }

  return res.status(200).json(
    new ApiResponse(200, order, 'Order cancelled successfully')
  )
})

// @desc    Get order statistics (admin only)
// @route   GET /api/admin/orders/stats
// @access  Private/Admin
export const getOrderStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  
  let matchStage = {}
  if (startDate || endDate) {
    matchStage.createdAt = {}
    if (startDate) matchStage.createdAt.$gte = new Date(startDate)
    if (endDate) matchStage.createdAt.$lte = new Date(endDate)
  }

  const stats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        totalItemsSold: { 
          $sum: { 
            $sum: '$items.quantity' 
          } 
        }
      }
    }
  ])

  const statusStats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    }
  ])

  const paymentStats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentMethod.type',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    }
  ])

  // Top selling products
  const topProducts = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        productName: { $first: '$items.name' }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 }
  ])

  return res.status(200).json(
    new ApiResponse(200, {
      overview: stats[0] || { 
        totalOrders: 0, 
        totalRevenue: 0, 
        averageOrderValue: 0,
        totalItemsSold: 0 
      },
      statusStats,
      paymentStats,
      topProducts
    }, 'Order statistics retrieved successfully')
  )
})

// @desc    Get all orders (admin only)
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    paymentStatus, 
    search,
    startDate,
    endDate
  } = req.query

  let query = {}
  
  if (status) query.orderStatus = status
  if (paymentStatus) query.paymentStatus = paymentStatus
  
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) query.createdAt.$gte = new Date(startDate)
    if (endDate) query.createdAt.$lte = new Date(endDate)
  }
  
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customerInfo.name': { $regex: search, $options: 'i' } },
      { 'customerInfo.email': { $regex: search, $options: 'i' } }
    ]
  }

  const orders = await Order.find(query)
    .populate([
      {
        path: 'user',
        select: 'name email phone'
      },
      {
        path: 'items.product',
        select: 'name images'
      }
    ])
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await Order.countDocuments(query)

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
        hasPrevPage: parseInt(page) > 1
      }
    }, 'Orders retrieved successfully')
  )
})

// Helper function to calculate estimated delivery
const calculateEstimatedDelivery = (city) => {
  const today = new Date()
  let deliveryDays = 3 // Default 3 days
  
  // Bangladeshi major cities delivery time
  const majorCities = ['dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barisal']
  const cityLower = city?.toLowerCase() || ''
  
  if (majorCities.some(majorCity => cityLower.includes(majorCity))) {
    deliveryDays = 1 // Next day delivery for major cities
  } else {
    deliveryDays = 3 // 3 days for other areas
  }
  
  const estimatedDate = new Date(today)
  estimatedDate.setDate(today.getDate() + deliveryDays)
  
  return estimatedDate
}

// Export statements are already handled by individual export statements above