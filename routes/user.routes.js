import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  validateUpdateProfile,
  validateMongoId,
  validatePagination
} from '../middleware/validation.middleware.js';
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAllUsers
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validateUpdateProfile, updateProfile);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:id', validateMongoId, updateAddress);
router.delete('/addresses/:id', validateMongoId, deleteAddress);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', validateMongoId, addToWishlist);
router.delete('/wishlist/:productId', validateMongoId, removeFromWishlist);

// Admin routes
router.get('/all', authorize('admin'), validatePagination, getAllUsers);

export default router; 