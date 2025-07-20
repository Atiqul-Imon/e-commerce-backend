import User from '../models/User.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendToken } from '../utils/sendToken.js'
import crypto from 'crypto'

// Helper function to validate email or phone
const isValidIdentifier = (identifier) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^01[3-9]\d{8}$/
  
  return emailRegex.test(identifier) || phoneRegex.test(identifier)
}

// Helper function to determine if identifier is email or phone
const getIdentifierType = (identifier) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(identifier) ? 'email' : 'phone'
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { identifier, password } = req.body

  // Validate required fields
  if (!identifier || !password) {
    throw new ApiError(400, 'Email/Phone and password are required')
  }

  // Validate identifier format
  if (!isValidIdentifier(identifier)) {
    throw new ApiError(400, 'Please enter a valid email address or phone number (01XXXXXXXXX)')
  }

  // Validate password length (reduced for easier registration)
  if (password.length < 4) {
    throw new ApiError(400, 'Password must be at least 4 characters long')
  }

  const identifierType = getIdentifierType(identifier)
  const query = identifierType === 'email' ? { email: identifier } : { phone: identifier }

  // Check if user already exists
  const existingUser = await User.findOne(query)
  if (existingUser) {
    throw new ApiError(400, `${identifierType === 'email' ? 'Email' : 'Phone number'} already registered`)
  }

  // Create user data
  const userData = {
    password,
    role: 'user'
  }

  if (identifierType === 'email') {
    userData.email = identifier
    userData.name = identifier.split('@')[0] // Use email prefix as name
  } else {
    userData.phone = identifier
    userData.name = `User${Date.now()}` // Generate temporary name
  }

  // Create user
  const user = await User.create(userData)

  // Generate token and send response
  sendToken(user, 201, res, 'User registered successfully')
})

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { identifier, password } = req.body

  // Validate required fields
  if (!identifier || !password) {
    throw new ApiError(400, 'Email/Phone and password are required')
  }

  // Validate identifier format
  if (!isValidIdentifier(identifier)) {
    throw new ApiError(400, 'Please enter a valid email address or phone number')
  }

  const identifierType = getIdentifierType(identifier)
  const query = identifierType === 'email' ? { email: identifier } : { phone: identifier }

  // Find user by email or phone
  const user = await User.findOne(query).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid credentials')
  }

  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials')
  }

  // Generate token and send response
  sendToken(user, 200, res, 'Login successful')
})

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  })
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
  
  res.status(200).json({
    success: true,
    user
  })
})

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required')
  }

  if (newPassword.length < 4) {
    throw new ApiError(400, 'Password must be at least 4 characters long')
  }

  const user = await User.findById(req.user.id).select('+password')

  const isPasswordValid = await user.isPasswordCorrect(currentPassword)
  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect')
  }

  user.password = newPassword
  await user.save()

  sendToken(user, 200, res, 'Password updated successfully')
})

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { identifier } = req.body

  if (!identifier) {
    throw new ApiError(400, 'Email or phone number is required')
  }

  if (!isValidIdentifier(identifier)) {
    throw new ApiError(400, 'Please enter a valid email address or phone number')
  }

  const identifierType = getIdentifierType(identifier)
  const query = identifierType === 'email' ? { email: identifier } : { phone: identifier }

  const user = await User.findOne(query)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: false })

  // TODO: Send reset token via email/SMS
  // For now, just return the token (in production, send via email/SMS)
  
  res.status(200).json({
    success: true,
    message: `Reset token sent to your ${identifierType}`,
    resetToken: resetToken // Remove this in production
  })
})

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params
  const { password } = req.body

  if (!password) {
    throw new ApiError(400, 'New password is required')
  }

  if (password.length < 4) {
    throw new ApiError(400, 'Password must be at least 4 characters long')
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  })

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token')
  }

  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  sendToken(user, 200, res, 'Password reset successfully')
}) 