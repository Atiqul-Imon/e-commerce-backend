import User from '../models/User.model.js'
import Product from '../models/product.model.js'
import Order from '../models/Order.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendToken } from '../utils/sendToken.js'

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  // Validate required fields
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required')
  }

  // Find admin user
  const admin = await User.findOne({ email, role: { $in: ['admin', 'moderator'] } }).select('+password')
  if (!admin) {
    throw new ApiError(401, 'Invalid credentials')
  }

  // Check password
  const isPasswordValid = await admin.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials')
  }

  // Generate token and send response
  sendToken(admin, 200, res, 'Admin login successful')
})

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private (Admin only)
export const getAdminProfile = asyncHandler(async (req, res, next) => {
  const admin = await User.findById(req.user.id)
  
  if (!admin || !['admin', 'moderator'].includes(admin.role)) {
    throw new ApiError(403, 'Access denied. Admin privileges required.')
  }

  res.status(200).json({
    success: true,
    data: admin
  })
})

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private (Admin only)
export const updateAdminProfile = asyncHandler(async (req, res, next) => {
  const { name, email, avatar } = req.body

  const admin = await User.findById(req.user.id)
  
  if (!admin || !['admin', 'moderator'].includes(admin.role)) {
    throw new ApiError(403, 'Access denied. Admin privileges required.')
  }

  // Update fields if provided
  if (name) admin.name = name
  if (email) admin.email = email
  if (avatar) admin.avatar = avatar

  await admin.save()

  res.status(200).json({
    success: true,
    message: 'Admin profile updated successfully',
    data: admin
  })
})

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get total users
  const totalUsers = await User.countDocuments({ role: 'user' })
  
  // Get total admins
  const totalAdmins = await User.countDocuments({ role: { $in: ['admin', 'moderator'] } })

  // Mock stats for now (will be replaced with real data)
  const stats = {
    totalUsers,
    totalAdmins,
    totalProducts: 456,
    totalOrders: 2300,
    totalRevenue: 45231,
    recentOrders: [
      { id: '#1234', customer: 'John Doe', amount: 299.99, status: 'Delivered', date: '2024-01-15' },
      { id: '#1235', customer: 'Jane Smith', amount: 199.99, status: 'Processing', date: '2024-01-14' },
      { id: '#1236', customer: 'Mike Johnson', amount: 399.99, status: 'Shipped', date: '2024-01-13' }
    ],
    salesData: [
      { name: 'Jan', sales: 4000 },
      { name: 'Feb', sales: 3000 },
      { name: 'Mar', sales: 2000 },
      { name: 'Apr', sales: 2780 },
      { name: 'May', sales: 1890 },
      { name: 'Jun', sales: 2390 }
    ],
    categoryData: [
      { name: 'Fashion', value: 400, color: '#8884d8' },
      { name: 'Electronics', value: 300, color: '#82ca9d' },
      { name: 'Home', value: 200, color: '#ffc658' },
      { name: 'Sports', value: 100, color: '#ff7300' }
    ]
  }

  res.status(200).json({
    success: true,
    data: stats
  })
})

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({ role: 'user' }).select('-password')
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  })
})

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin only)
export const updateUserRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { role } = req.body

  if (!['user', 'moderator', 'admin'].includes(role)) {
    throw new ApiError(400, 'Invalid role')
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  ).select('-password')

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: user
  })
})

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  const user = await User.findById(id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Prevent deleting admin users
  if (['admin', 'moderator'].includes(user.role)) {
    throw new ApiError(403, 'Cannot delete admin users')
  }

  await User.findByIdAndDelete(id)

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  })
}) 

// @desc    Get inventory management data
// @route   GET /api/admin/inventory
// @access  Private (Admin only)
export const getInventory = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, category, stockStatus } = req.query

  // Build query - include only active products for admin inventory
  const query = { isActive: true }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ]
  }
  
  if (category) {
    query.category = category
  }
  
  if (stockStatus) {
    switch (stockStatus) {
      case 'in-stock':
        query.stock = { $gt: 0 }
        break
      case 'out-of-stock':
        query.stock = 0
        break
      case 'low-stock':
        query.stock = { $gt: 0, $lte: 10 }
        break
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  
  // Get products with pagination
  const products = await Product.find(query)
    .select('name sku category brand stock price images isActive ratings numReviews createdAt updatedAt description')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  // Get total count
  const total = await Product.countDocuments(query)

  // Get inventory stats (only for active products)
  const totalProducts = await Product.countDocuments(query)
  const outOfStock = await Product.countDocuments({ ...query, stock: 0 })
  const lowStock = await Product.countDocuments({ ...query, stock: { $gt: 0, $lte: 10 } })
  const totalValue = await Product.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
  ])

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalProducts,
        outOfStock,
        lowStock,
        totalValue: totalValue[0]?.total || 0
      }
    }
  })
})

// @desc    Get all products for admin (including inactive)
// @route   GET /api/admin/products
// @access  Private (Admin only)
export const getAllProducts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, category, stockStatus } = req.query

  // Build query - include ALL products (active and inactive)
  const query = {}
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ]
  }
  
  if (category) {
    query.category = category
  }
  
  if (stockStatus) {
    switch (stockStatus) {
      case 'in-stock':
        query.stock = { $gt: 0 }
        break
      case 'out-of-stock':
        query.stock = 0
        break
      case 'low-stock':
        query.stock = { $gt: 0, $lte: 10 }
        break
    }
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  
  // Get products with pagination
  const products = await Product.find(query)
    .select('name sku category brand stock price images isActive ratings numReviews createdAt updatedAt description')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  // Get total count
  const total = await Product.countDocuments(query)

  // Get stats
  const totalProducts = await Product.countDocuments()
  const activeProducts = await Product.countDocuments({ isActive: true })
  const outOfStock = await Product.countDocuments({ stock: 0 })
  const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } })

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalProducts,
        activeProducts,
        outOfStock,
        lowStock
      }
    }
  })
})

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin only)
export const updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const updateData = req.body

  const product = await Product.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  )

  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  res.status(200).json({
    success: true,
    data: product,
    message: 'Product updated successfully'
  })
})

// @desc    Delete product (soft delete)
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin only)
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  const product = await Product.findById(id)

  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  // Soft delete - mark as inactive
  product.isActive = false
  await product.save()

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  })
})

// @desc    Update product stock
// @route   PUT /api/admin/inventory/:id
// @access  Private (Admin only)
export const updateProductStock = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { stock, action, quantity, notes } = req.body

  const product = await Product.findById(id)
  if (!product) {
    throw new ApiError(404, 'Product not found')
  }

  let newStock = product.stock

  if (action === 'set') {
    newStock = stock
  } else if (action === 'add') {
    newStock = product.stock + quantity
  } else if (action === 'subtract') {
    newStock = Math.max(0, product.stock - quantity)
  } else {
    throw new ApiError(400, 'Invalid action. Use "set", "add", or "subtract"')
  }

  product.stock = newStock
  
  // Add stock history
  if (!product.stockHistory) {
    product.stockHistory = []
  }
  
  product.stockHistory.push({
    action,
    quantity: action === 'set' ? stock : quantity,
    previousStock: product.stock,
    newStock,
    notes,
    updatedBy: req.user.id,
    updatedAt: new Date()
  })

  await product.save()

  res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    data: {
      productId: product._id,
      name: product.name,
      previousStock: product.stock,
      newStock,
      action
    }
  })
})

// @desc    Bulk update inventory
// @route   PUT /api/admin/inventory/bulk
// @access  Private (Admin only)
export const bulkUpdateInventory = asyncHandler(async (req, res, next) => {
  const { products, action, quantity } = req.body

  if (!Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, 'Products array is required')
  }

  const results = []
  const errors = []

  for (const productId of products) {
    try {
      const product = await Product.findById(productId)
      if (!product) {
        errors.push({ productId, error: 'Product not found' })
        continue
      }

      let newStock = product.stock

      if (action === 'add') {
        newStock = product.stock + quantity
      } else if (action === 'subtract') {
        newStock = Math.max(0, product.stock - quantity)
      } else {
        errors.push({ productId, error: 'Invalid action' })
        continue
      }

      product.stock = newStock
      await product.save()

      results.push({
        productId: product._id,
        name: product.name,
        previousStock: product.stock,
        newStock,
        action
      })
    } catch (error) {
      errors.push({ productId, error: error.message })
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk update completed. ${results.length} products updated, ${errors.length} errors.`,
    data: {
      results,
      errors
    }
  })
})

// @desc    Get all orders (Admin)
// @route   GET /api/admin/orders
// @access  Private (Admin only)
export const getAllOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, search, dateFrom, dateTo } = req.query

  // Build query
  const query = {}
  
  if (status) {
    query.orderStatus = status
  }
  
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.street': { $regex: search, $options: 'i' } },
      { 'shippingAddress.city': { $regex: search, $options: 'i' } }
    ]
  }
  
  if (dateFrom || dateTo) {
    query.createdAt = {}
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo) query.createdAt.$lte = new Date(dateTo)
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  
  // Get orders with pagination
  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  // Get total count
  const total = await Order.countDocuments(query)

  // Get order stats
  const orderStats = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalPrice' }
      }
    }
  ])

  const totalRevenue = await Order.aggregate([
    { $match: { orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ])

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        orderStats,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    }
  })
})

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin only)
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { status, trackingNumber, trackingUrl, notes } = req.body

  const validStatuses = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ]

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid order status')
  }

  const order = await Order.findById(id)
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  const previousStatus = order.orderStatus
  order.orderStatus = status

  // Update tracking info if provided
  if (trackingNumber) order.trackingNumber = trackingNumber
  if (trackingUrl) order.trackingUrl = trackingUrl
  if (notes) order.orderNotes = notes

  // Set delivered date if status is Delivered
  if (status === 'Delivered' && !order.deliveredAt) {
    order.deliveredAt = new Date()
  }

  // Set cancelled date if status is Cancelled
  if (status === 'Cancelled' && !order.cancelledAt) {
    order.cancelledAt = new Date()
    order.cancelledBy = req.user.id
  }

  await order.save()

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl
    }
  })
})

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Private (Admin only)
export const getOrderDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  const order = await Order.findById(id)
    .populate('user', 'name email phone')
    .populate('items.product', 'name images sku')
    .populate('cancelledBy', 'name')

  if (!order) {
    throw new ApiError(404, 'Order not found')
  }

  res.status(200).json({
    success: true,
    data: order
  })
})

// @desc    Get all customers (Admin)
// @route   GET /api/admin/customers
// @access  Private (Admin only)
export const getAllCustomers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, status, dateFrom, dateTo } = req.query

  // Build query
  const query = { role: 'user' }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ]
  }
  
  if (status === 'active') {
    query.isActive = true
  } else if (status === 'inactive') {
    query.isActive = false
  }
  
  if (dateFrom || dateTo) {
    query.createdAt = {}
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo) query.createdAt.$lte = new Date(dateTo)
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  
  // Get customers with pagination
  const customers = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  // Get total count
  const total = await User.countDocuments(query)

  // Get customer stats
  const totalCustomers = await User.countDocuments({ role: 'user' })
  const activeCustomers = await User.countDocuments({ role: 'user', isActive: true })
  const newCustomersThisMonth = await User.countDocuments({
    role: 'user',
    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
  })

  // Get top customers by order count
  const topCustomers = await Order.aggregate([
    { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } },
    { $sort: { totalSpent: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $project: { name: '$user.name', email: '$user.email', orderCount: 1, totalSpent: 1 } }
  ])

  res.status(200).json({
    success: true,
    data: {
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        topCustomers
      }
    }
  })
})

// @desc    Get customer details
// @route   GET /api/admin/customers/:id
// @access  Private (Admin only)
export const getCustomerDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  const customer = await User.findById(id).select('-password')
  if (!customer) {
    throw new ApiError(404, 'Customer not found')
  }

  // Get customer orders
  const orders = await Order.find({ user: id })
    .sort({ createdAt: -1 })
    .limit(10)

  // Get order statistics
  const orderStats = await Order.aggregate([
    { $match: { user: customer._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ])

  // Get recent activity
  const recentActivity = await Order.find({ user: id })
    .select('orderNumber orderStatus totalPrice createdAt')
    .sort({ createdAt: -1 })
    .limit(5)

  res.status(200).json({
    success: true,
    data: {
      customer,
      orders,
      stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 },
      recentActivity
    }
  })
})

// @desc    Update customer status
// @route   PUT /api/admin/customers/:id/status
// @access  Private (Admin only)
export const updateCustomerStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { isActive } = req.body

  const customer = await User.findById(id)
  if (!customer) {
    throw new ApiError(404, 'Customer not found')
  }

  customer.isActive = isActive
  await customer.save()

  res.status(200).json({
    success: true,
    message: 'Customer status updated successfully',
    data: {
      customerId: customer._id,
      name: customer.name,
      email: customer.email,
      isActive: customer.isActive
    }
  })
})

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
export const getAnalytics = asyncHandler(async (req, res, next) => {
  const { period = '30d' } = req.query

  let dateFilter = {}
  const now = new Date()

  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      break
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      break
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
      break
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
      break
  }

  // Sales analytics
  const salesData = await Order.aggregate([
    { $match: { createdAt: dateFilter, orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalPrice' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ])

  // Top products
  const topProducts = await Order.aggregate([
    { $match: { createdAt: dateFilter } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    { $project: { name: '$product.name', totalSold: 1, revenue: 1 } }
  ])

  // Category performance
  const categoryPerformance = await Order.aggregate([
    { $match: { createdAt: dateFilter } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { revenue: -1 } }
  ])

  // Customer analytics
  const newCustomers = await User.countDocuments({
    role: 'user',
    createdAt: dateFilter
  })

  const totalRevenue = await Order.aggregate([
    { $match: { createdAt: dateFilter, orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ])

  const totalOrders = await Order.countDocuments({
    createdAt: dateFilter,
    orderStatus: { $nin: ['Cancelled', 'Refunded'] }
  })

  res.status(200).json({
    success: true,
    data: {
      salesData,
      topProducts,
      categoryPerformance,
      summary: {
        newCustomers,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders
      }
    }
  })
}) 