import Cart from '../models/Cart.model.js'
import Product from '../models/product.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: []
    })
  }

  // Filter out inactive products and update cart
  const activeItems = cart.items.filter(item => 
    item.product && item.product.isActive && item.product.stock > 0
  )

  if (activeItems.length !== cart.items.length) {
    cart.items = activeItems
    await cart.save()
  }

  // Calculate totals
  const subtotal = cart.items.reduce((total, item) => {
    return total + (item.product.price * item.quantity)
  }, 0)

  const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)

  // Bangladeshi shipping calculation
  const freeShippingThreshold = 1000 // ৳1000 for free shipping
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 60 // ৳60 standard shipping
  const total = subtotal + shippingCost

  return res.status(200).json(
    new ApiResponse(200, {
      cart,
      summary: {
        subtotal,
        shippingCost,
        total,
        totalItems,
        freeShippingThreshold,
        freeShippingEligible: subtotal >= freeShippingThreshold
      }
    }, 'Cart retrieved successfully')
  )
})

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, selectedColor, selectedSize } = req.body

  if (!productId) {
    throw new ApiError(400, 'Product ID is required')
  }

  if (quantity <= 0) {
    throw new ApiError(400, 'Quantity must be greater than 0')
  }

  // Verify product exists and is active
  const product = await Product.findById(productId)
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or inactive')
  }

  // Check stock availability
  if (product.stock < quantity) {
    throw new ApiError(400, `Only ${product.stock} items available in stock`)
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user.id })
  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: []
    })
  }

  // Check if product already exists in cart
  const existingItemIndex = cart.items.findIndex(item => 
    item.product.toString() === productId
  )

  if (existingItemIndex >= 0) {
    // Update existing item quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity
    
    if (newQuantity > product.stock) {
      throw new ApiError(400, `Cannot add more items. Only ${product.stock} items available in stock`)
    }

    cart.items[existingItemIndex].quantity = newQuantity
    cart.items[existingItemIndex].price = product.price // Update price in case it changed
    cart.items[existingItemIndex].selectedColor = selectedColor || cart.items[existingItemIndex].selectedColor
    cart.items[existingItemIndex].selectedSize = selectedSize || cart.items[existingItemIndex].selectedSize
  } else {
    // Add new item to cart
    cart.items.push({
      product: productId,
      quantity,
      selectedColor,
      selectedSize,
      price: product.price // Store price at time of adding
    })
  }

  await cart.save()

  // Populate cart items
  await cart.populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  return res.status(200).json(
    new ApiResponse(200, cart, 'Item added to cart successfully')
  )
})

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params
  const { quantity } = req.body

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, 'Valid quantity is required')
  }

  const cart = await Cart.findOne({ user: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId)
  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart')
  }

  // Check product stock
  const product = await Product.findById(cart.items[itemIndex].product)
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or inactive')
  }

  if (quantity > product.stock) {
    throw new ApiError(400, `Only ${product.stock} items available in stock`)
  }

  cart.items[itemIndex].quantity = quantity
  await cart.save()

  await cart.populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  return res.status(200).json(
    new ApiResponse(200, cart, 'Cart item updated successfully')
  )
})

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params

  const cart = await Cart.findOne({ user: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId)
  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart')
  }

  cart.items.splice(itemIndex, 1)
  await cart.save()

  await cart.populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  return res.status(200).json(
    new ApiResponse(200, cart, 'Item removed from cart successfully')
  )
})

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id })
  if (!cart) {
    throw new ApiError(404, 'Cart not found')
  }

  cart.items = []
  await cart.save()

  return res.status(200).json(
    new ApiResponse(200, cart, 'Cart cleared successfully')
  )
})

// @desc    Sync guest cart with user cart
// @route   POST /api/cart/sync
// @access  Private
export const syncGuestCart = asyncHandler(async (req, res) => {
  const { guestCartItems } = req.body

  if (!Array.isArray(guestCartItems)) {
    throw new ApiError(400, 'Guest cart items must be an array')
  }

  // Find or create user cart
  let cart = await Cart.findOne({ user: req.user.id })
  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: []
    })
  }

  // Process each guest cart item
  for (const guestItem of guestCartItems) {
    const product = await Product.findById(guestItem._id || guestItem.productId)
    if (!product || !product.isActive) {
      continue // Skip invalid products
    }

    // Check if product already exists in user cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.product.toString() === product._id.toString()
    )

    if (existingItemIndex >= 0) {
      // Update quantity (take higher quantity)
      const newQuantity = Math.max(
        cart.items[existingItemIndex].quantity,
        guestItem.quantity || 1
      )
      
      if (newQuantity <= product.stock) {
        cart.items[existingItemIndex].quantity = newQuantity
      }
    } else {
      // Add new item if stock allows
      const quantity = Math.min(guestItem.quantity || 1, product.stock)
      if (quantity > 0) {
        cart.items.push({
          product: product._id,
          quantity,
          selectedColor: guestItem.selectedColor,
          selectedSize: guestItem.selectedSize,
          priceAtTime: product.price
        })
      }
    }
  }

  await cart.save()

  await cart.populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  return res.status(200).json(
    new ApiResponse(200, cart, 'Guest cart synced successfully')
  )
})

// @desc    Validate cart items before checkout
// @route   POST /api/cart/validate
// @access  Private
export const validateCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate({
    path: 'items.product',
    select: 'name price originalPrice images stock isActive discountPercentage'
  })

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty')
  }

  const validationErrors = []
  const validItems = []

  for (let i = 0; i < cart.items.length; i++) {
    const item = cart.items[i]
    
    if (!item.product || !item.product.isActive) {
      validationErrors.push({
        itemId: item._id,
        error: 'Product is no longer available'
      })
      continue
    }

    if (item.product.stock < item.quantity) {
      validationErrors.push({
        itemId: item._id,
        error: `Only ${item.product.stock} items available in stock`,
        availableStock: item.product.stock
      })
      // Update quantity to available stock
      item.quantity = item.product.stock
    }

    if (item.quantity > 0) {
      validItems.push(item)
    }
  }

  // Update cart with valid items
  cart.items = validItems
  await cart.save()

  const isValid = validationErrors.length === 0

  return res.status(200).json(
    new ApiResponse(200, {
      cart,
      isValid,
      validationErrors
    }, isValid ? 'Cart is valid' : 'Cart validation completed with issues')
  )
})