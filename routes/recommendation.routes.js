import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getUserRecommendations,
  getProductRecommendations,
  getTrendingProducts,
  getFrequentlyBoughtTogether,
  getHomepageRecommendations
} from '../controllers/recommendation.controller.js';

const router = express.Router();

// Recommendation routes
router.get('/user', protect, getUserRecommendations);
router.get('/product/:productId', getProductRecommendations);
router.get('/trending', getTrendingProducts);
router.get('/frequently-bought/:productId', getFrequentlyBoughtTogether);
router.get('/homepage', getHomepageRecommendations);

export default router;
