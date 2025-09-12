import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

// Generic validation handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    throw new ApiError(400, 'Validation failed', false, errorMessages);
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required')
    .custom((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Please enter a valid email address or phone number (01XXXXXXXXX)');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters long'),
  handleValidationErrors
];

export const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Product validation rules
export const validateCreateProduct = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Product description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('discountPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Subcategory must be between 1 and 50 characters'),
  body('brand')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand must be between 1 and 50 characters'),
  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one image is required'),
  body('images.*')
    .isURL()
    .withMessage('Each image must be a valid URL'),
  body('colors')
    .optional()
    .isArray()
    .withMessage('Colors must be an array'),
  body('sizes')
    .optional()
    .isArray()
    .withMessage('Sizes must be an array'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU must be between 1 and 50 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  handleValidationErrors
];

export const validateUpdateProduct = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Product description must be between 10 and 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  handleValidationErrors
];

// Order validation rules
export const validateCreateOrder = [
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  body('shippingAddress.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  body('shippingAddress.postalCode')
    .optional()
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Postal code must be between 4 and 10 characters'),
  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  body('shippingAddress.phone')
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Phone number must be a valid Bangladeshi number (01XXXXXXXXX)'),
  body('paymentMethod')
    .isObject()
    .withMessage('Payment method is required'),
  body('paymentMethod.type')
    .isIn(['cash_on_delivery', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'card'])
    .withMessage('Invalid payment method type'),
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Order items are required for guest checkout'),
  body('items.*.productId')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('customerInfo')
    .optional()
    .isObject()
    .withMessage('Customer information must be an object'),
  body('customerInfo.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('customerInfo.email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be valid'),
  body('customerInfo.phone')
    .optional()
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Customer phone must be a valid Bangladeshi number'),
  handleValidationErrors
];

// Cart validation rules
export const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('selectedColor')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Selected color must be between 1 and 50 characters'),
  body('selectedSize')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Selected size must be between 1 and 20 characters'),
  handleValidationErrors
];

export const validateUpdateCartItem = [
  param('itemId')
    .isMongoId()
    .withMessage('Invalid cart item ID'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  handleValidationErrors
];

// User validation rules
export const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),
  body('phone')
    .optional()
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Phone must be a valid Bangladeshi number'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  handleValidationErrors
];

// Query parameter validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'price', 'rating'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

// ID parameter validation
export const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

