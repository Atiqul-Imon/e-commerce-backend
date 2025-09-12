import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many requests from this IP, please try again later.');
  }
});

// Auth rate limiter (more restrictive)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many authentication attempts, please try again later.');
  }
});

// Password reset rate limiter (very restrictive)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many password reset attempts, please try again later.');
  }
});

// Order creation rate limiter
export const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 orders per 5 minutes
  message: {
    success: false,
    error: 'Too many order attempts, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many order attempts, please try again later.');
  }
});

// Product creation rate limiter (admin)
export const productCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 product creations per minute
  message: {
    success: false,
    error: 'Too many product creation attempts, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many product creation attempts, please try again later.');
  }
});

// Search rate limiter
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 searches per minute
  message: {
    success: false,
    error: 'Too many search requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many search requests, please try again later.');
  }
});

// Cart operations rate limiter
export const cartLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 cart operations per minute
  message: {
    success: false,
    error: 'Too many cart operations, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new ApiError(429, 'Too many cart operations, please try again later.');
  }
});

// User-specific rate limiter (for authenticated users)
export const createUserLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: `${Math.ceil(windowMs / 60000)} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw new ApiError(429, 'Too many requests, please try again later.');
    }
  });
};

// Dynamic rate limiter based on user role
export const createRoleBasedLimiter = (roleLimits = {}) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const userRole = req.user?.role || 'guest';
      return roleLimits[userRole] || 100; // default limit
    },
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
    message: {
      success: false,
      error: 'Rate limit exceeded for your role.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw new ApiError(429, 'Rate limit exceeded for your role.');
    }
  });
};

// Default role-based limits
export const roleBasedLimiter = createRoleBasedLimiter({
  admin: 2000,
  user: 500,
  guest: 100
});
