import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate.middleware.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getInventory,
  updateProductStock,
  bulkUpdateInventory,
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  getAllCustomers,
  getCustomerDetails,
  updateCustomerStatus,
  getAnalytics
} from '../controllers/admin.controller.js';

const router = express.Router();

// Validation rules
const adminLoginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
];

const updateStockValidation = [
  body('action')
    .isIn(['set', 'add', 'subtract'])
    .withMessage('Action must be set, add, or subtract'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('trackingNumber')
    .optional()
    .isString()
    .withMessage('Tracking number must be a string'),
  body('trackingUrl')
    .optional()
    .isURL()
    .withMessage('Tracking URL must be a valid URL')
];

const bulkUpdateValidation = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products must be an array with at least one item'),
  body('action')
    .isIn(['add', 'subtract'])
    .withMessage('Action must be add or subtract'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
];

// Public routes
router.post('/login', adminLoginValidation, validateRequest, adminLogin);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin', 'moderator'));

// Profile routes
router.get('/profile', getAdminProfile);
router.put('/profile', updateProfileValidation, validateRequest, updateAdminProfile);

// Dashboard routes
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);

// User management routes (Admin only)
router.get('/users', getAllUsers);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.delete('/users/:id', authorize('admin'), deleteUser);

// Inventory management routes
router.get('/inventory', getInventory);
router.put('/inventory/:id', updateStockValidation, validateRequest, updateProductStock);
router.put('/inventory/bulk', bulkUpdateValidation, validateRequest, bulkUpdateInventory);

// Order management routes
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.put('/orders/:id/status', updateOrderStatusValidation, validateRequest, updateOrderStatus);

// Customer management routes
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerDetails);
router.put('/customers/:id/status', updateCustomerStatus);

export default router; 