import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductReview,
  getFeaturedProducts,
  getTrendingProducts,
  getBestSellers,
  getCategories,
  getBrands,
  getRelatedProducts,
  createFashionProducts,
  generateProductSKU,
  batchGenerateSKUs,
  validateProductSKU,
  getProductsWithoutSKU
} from '../controllers/product.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/best-sellers', getBestSellers);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

// Protected routes (require authentication)
router.post('/:id/reviews', protect, addProductReview);

// Admin routes (require authentication and admin role)
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

// SKU Management routes (admin only)
router.post('/:id/generate-sku', protect, authorize('admin'), generateProductSKU);
router.post('/batch-generate-skus', protect, authorize('admin'), batchGenerateSKUs);
router.post('/validate-sku', protect, authorize('admin'), validateProductSKU);
router.get('/admin/without-sku', protect, authorize('admin'), getProductsWithoutSKU);

// Development route for creating fashion products
router.post('/fashion/create', createFashionProducts);

export default router; 