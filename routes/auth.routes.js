import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate.middleware.js';
import { protect, authRateLimit } from '../middleware/auth.middleware.js';
import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters')
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 4 })
    .withMessage('New password must be at least 4 characters')
];



// Routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, authRateLimit(), login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePasswordValidation, validateRequest, updatePassword);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, validateRequest, resetPassword);

export default router; 