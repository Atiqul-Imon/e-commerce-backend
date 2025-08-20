import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    } else {
      throw new ApiError(401, 'Not authorized to access this route');
    }
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized to access this route');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `User role ${req.user.role} is not authorized to access this route`);
    }

    next();
  };
};

// Admin only access
export const admin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authorized to access this route');
  }

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  next();
};

// Optional authentication - doesn't throw error if no token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid but we don't throw error for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});

// Check if user is owner of resource or admin
export const checkOwnership = (modelName) => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user._id;

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resource = await mongoose.model(modelName).findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    if (resource.user && resource.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to access this resource');
    }

    next();
  });
};

// Rate limiting for authentication attempts
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (!attempts.has(ip)) {
      attempts.set(ip, { count: 0, resetTime: now + windowMs });
    }

    const attempt = attempts.get(ip);
    
    if (now > attempt.resetTime) {
      attempt.count = 0;
      attempt.resetTime = now + windowMs;
    }

    attempt.count++;

    if (attempt.count > maxAttempts) {
      throw new ApiError(429, 'Too many authentication attempts. Please try again later.');
    }

    next();
  };
}; 