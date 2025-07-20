import User from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
  
  res.status(200).json({
    success: true,
    user
  })
})

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email, phone, avatar } = req.body

  // Find user and update
  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Update fields if provided
  if (name) user.name = name
  if (email) user.email = email
  if (phone) user.phone = phone
  if (avatar) user.avatar = avatar

  await user.save()

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user
  })
})

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
  
  res.status(200).json({
    success: true,
    addresses: user.addresses || []
  })
})

// @desc    Add user address
// @route   POST /api/users/addresses
// @access  Private
export const addAddress = asyncHandler(async (req, res, next) => {
  const { address, city, state, zipCode, country, isDefault } = req.body

  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const newAddress = {
    address,
    city,
    state,
    zipCode,
    country,
    isDefault: isDefault || false
  }

  // If this is the first address, make it default
  if (!user.addresses || user.addresses.length === 0) {
    newAddress.isDefault = true
  }

  // If this address is default, unset other defaults
  if (newAddress.isDefault && user.addresses) {
    user.addresses.forEach(addr => {
      addr.isDefault = false
    })
  }

  user.addresses = user.addresses || []
  user.addresses.push(newAddress)
  await user.save()

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    address: newAddress
  })
})

// @desc    Update user address
// @route   PUT /api/users/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { address, city, state, zipCode, country, isDefault } = req.body

  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id)
  
  if (addressIndex === -1) {
    throw new ApiError(404, 'Address not found')
  }

  // Update address fields
  if (address) user.addresses[addressIndex].address = address
  if (city) user.addresses[addressIndex].city = city
  if (state) user.addresses[addressIndex].state = state
  if (zipCode) user.addresses[addressIndex].zipCode = zipCode
  if (country) user.addresses[addressIndex].country = country

  // Handle default address
  if (isDefault !== undefined) {
    if (isDefault) {
      // Unset other defaults
      user.addresses.forEach(addr => {
        addr.isDefault = false
      })
    }
    user.addresses[addressIndex].isDefault = isDefault
  }

  await user.save()

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    address: user.addresses[addressIndex]
  })
})

// @desc    Delete user address
// @route   DELETE /api/users/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id)
  
  if (addressIndex === -1) {
    throw new ApiError(404, 'Address not found')
  }

  // Remove address
  user.addresses.splice(addressIndex, 1)

  // If we deleted the default address and there are other addresses, make the first one default
  if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
    user.addresses[0].isDefault = true
  }

  await user.save()

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully'
  })
})

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('wishlist')
  
  res.status(200).json({
    success: true,
    wishlist: user.wishlist || []
  })
})

// @desc    Add to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
export const addToWishlist = asyncHandler(async (req, res, next) => {
  const { productId } = req.params

  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Check if product is already in wishlist
  if (user.wishlist && user.wishlist.includes(productId)) {
    throw new ApiError(400, 'Product already in wishlist')
  }

  user.wishlist = user.wishlist || []
  user.wishlist.push(productId)
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Product added to wishlist'
  })
})

// @desc    Remove from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  const { productId } = req.params

  const user = await User.findById(req.user.id)
  
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  if (!user.wishlist || !user.wishlist.includes(productId)) {
    throw new ApiError(404, 'Product not in wishlist')
  }

  user.wishlist = user.wishlist.filter(id => id.toString() !== productId)
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist'
  })
})

// @desc    Get all users (Admin only)
// @route   GET /api/users/all
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({}).select('-password')
  
  res.status(200).json({
    success: true,
    count: users.length,
    users
  })
}) 