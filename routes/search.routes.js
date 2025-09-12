import express from 'express';
import {
  searchProducts,
  getPopularSearches,
  getSearchSuggestions
} from '../controllers/search.controller.js';
import { searchLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Search routes
router.get('/', searchLimiter, searchProducts);
router.get('/popular', getPopularSearches);
router.get('/suggestions', searchLimiter, getSearchSuggestions);

export default router;
