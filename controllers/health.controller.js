import mongoose from 'mongoose';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Basic health check
export const basicHealthCheck = async (req, res, next) => {
  try {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json(new ApiResponse(200, healthData, 'Service is healthy'));
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    next(new ApiError(500, 'Health check failed'));
  }
};

// Detailed health check
export const detailedHealthCheck = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {}
    };

    // Check MongoDB connection
    try {
      const mongoStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const mongoDuration = Date.now() - mongoStart;
      
      healthData.services.mongodb = {
        status: 'OK',
        responseTime: `${mongoDuration}ms`,
        connectionState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name
      };
    } catch (error) {
      healthData.services.mongodb = {
        status: 'ERROR',
        error: error.message
      };
      healthData.status = 'DEGRADED';
    }

    // Check Redis cache
    try {
      const cacheStart = Date.now();
      const cacheStats = cache.getStats();
      const cacheDuration = Date.now() - cacheStart;
      
      healthData.services.redis = {
        status: cache.isAvailable() ? 'OK' : 'UNAVAILABLE',
        responseTime: `${cacheDuration}ms`,
        connected: cache.isAvailable(),
        stats: cacheStats
      };
      
      if (!cache.isAvailable()) {
        healthData.status = 'DEGRADED';
      }
    } catch (error) {
      healthData.services.redis = {
        status: 'ERROR',
        error: error.message
      };
      healthData.status = 'DEGRADED';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthData.services.memory = {
      status: 'OK',
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    };

    // Check CPU usage
    const cpuUsage = process.cpuUsage();
    healthData.services.cpu = {
      status: 'OK',
      user: `${Math.round(cpuUsage.user / 1000)}ms`,
      system: `${Math.round(cpuUsage.system / 1000)}ms`
    };

    // Check disk space (if available)
    try {
      const fs = await import('fs');
      const stats = fs.statSync('.');
      healthData.services.disk = {
        status: 'OK',
        available: 'Unknown' // Would need additional package for disk space
      };
    } catch (error) {
      healthData.services.disk = {
        status: 'UNKNOWN',
        error: 'Disk space check not available'
      };
    }

    const totalDuration = Date.now() - startTime;
    healthData.responseTime = `${totalDuration}ms`;

    // Log health check
    logger.info('Health check performed', {
      status: healthData.status,
      duration: totalDuration,
      services: Object.keys(healthData.services)
    });

    const statusCode = healthData.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(new ApiResponse(statusCode, healthData, 'Health check completed'));

  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    next(new ApiError(500, 'Health check failed'));
  }
};

// Readiness check (for Kubernetes)
export const readinessCheck = async (req, res, next) => {
  try {
    const checks = {
      mongodb: false,
      redis: false
    };

    // Check MongoDB
    try {
      await mongoose.connection.db.admin().ping();
      checks.mongodb = true;
    } catch (error) {
      logger.warn('MongoDB readiness check failed', { error: error.message });
    }

    // Check Redis
    try {
      checks.redis = cache.isAvailable();
    } catch (error) {
      logger.warn('Redis readiness check failed', { error: error.message });
    }

    const isReady = Object.values(checks).every(check => check);
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Liveness check (for Kubernetes)
export const livenessCheck = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'ALIVE',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Liveness check failed', { error: error.message });
    res.status(503).json({
      status: 'DEAD',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Metrics endpoint
export const getMetrics = async (req, res, next) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      cache: cache.getStats(),
      logs: logger.getStats(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(new ApiResponse(200, metrics, 'Metrics retrieved successfully'));

  } catch (error) {
    logger.error('Metrics retrieval failed', { error: error.message });
    next(new ApiError(500, 'Failed to retrieve metrics'));
  }
};
