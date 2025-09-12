import express from 'express';
import { protect, authRateLimit } from '../middleware/auth.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateMongoId
} from '../middleware/validation.middleware.js';
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

// Routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, authRateLimit(), login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, validateUpdateProfile, updatePassword);
router.post('/forgot-password', validateLogin, forgotPassword);
router.put('/reset-password/:token', validateMongoId, resetPassword);

export default router; 