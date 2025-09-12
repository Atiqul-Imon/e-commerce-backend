import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import categoryRoutes from './routes/category.routes.js';
import reviewRoutes from './routes/review.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import cartRoutes from './routes/cart.routes.js';
import leadRoutes from './routes/lead.routes.js';
import searchRoutes from './routes/search.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import healthRoutes from './routes/health.routes.js';

// Import middleware
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { 
  generalLimiter, 
  authLimiter, 
  passwordResetLimiter, 
  orderLimiter, 
  searchLimiter, 
  cartLimiter,
  roleBasedLimiter 
} from './middleware/rateLimiter.middleware.js';
import { 
  securityHeaders, 
  additionalSecurity, 
  requestSizeLimiter, 
  securityLogger 
} from './middleware/security.middleware.js';
import logger from './utils/logger.js';

// Import database connection
import connectDB from './config/database.js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting - only in production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Production and development origins
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL || 'https://e-commerce-frontend-pink-xi.vercel.app',
          process.env.BACKEND_URL || 'https://e-commerce-backend-e8a0.onrender.com',
          'https://e-commerce-frontend-pink-xi.vercel.app', // Vercel frontend URL
          'https://e-commerce-backend-e8a0.onrender.com', // Render backend URL
          'https://arizaan.com', // Custom domain
          'https://www.arizaan.com' // Custom domain with www
        ] 
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://localhost:3002'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
}));

// Compression middleware
app.use(compression());

// Cache middleware for static responses
app.use((req, res, next) => {
  // Set cache headers for different types of responses
  if (req.path.startsWith('/api/products') && req.method === 'GET') {
    // Cache product data for 5 minutes
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.set('ETag', 'W/"products"');
  } else if (req.path.startsWith('/api/categories') && req.method === 'GET') {
    // Cache categories for 1 hour
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.set('ETag', 'W/"categories"');
  } else if (req.path.startsWith('/api/products/featured') && req.method === 'GET') {
    // Cache featured products for 10 minutes
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.set('ETag', 'W/"featured"');
  } else if (req.path.startsWith('/api/products/trending') && req.method === 'GET') {
    // Cache trending products for 15 minutes
    res.set('Cache-Control', 'public, max-age=900, s-maxage=900');
    res.set('ETag', 'W/"trending"');
  } else if (req.path.startsWith('/api/health') && req.method === 'GET') {
    // Cache health check for 30 seconds
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
  } else if (req.method === 'GET') {
    // Default cache for other GET requests
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  }
  
  next();
});

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint for basic server info
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-Commerce API Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      auth: '/api/auth',
      orders: '/api/orders',
      cart: '/api/cart'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

export default app; 