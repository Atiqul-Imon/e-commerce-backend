import express from 'express';
import {
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackLead
} from '../controllers/facebook.controller.js';

const router = express.Router();

// Facebook Conversions API routes
router.post('/pageview', trackPageView);
router.post('/viewcontent', trackViewContent);
router.post('/addtocart', trackAddToCart);
router.post('/initiatecheckout', trackInitiateCheckout);
router.post('/purchase', trackPurchase);
router.post('/lead', trackLead);

export default router;
