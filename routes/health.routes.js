import express from 'express';
import {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
  getMetrics
} from '../controllers/health.controller.js';

const router = express.Router();

// Health check routes
router.get('/', basicHealthCheck);
router.get('/detailed', detailedHealthCheck);
router.get('/ready', readinessCheck);
router.get('/live', livenessCheck);
router.get('/metrics', getMetrics);

export default router;
