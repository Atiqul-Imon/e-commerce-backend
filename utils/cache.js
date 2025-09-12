import redis from 'redis';

// Redis client configuration
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.warn('Redis server connection refused. Caching disabled.');
      return undefined;
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted. Caching disabled.');
      return undefined;
    }
    if (options.attempt > 10) {
      console.error('Redis max retry attempts reached. Caching disabled.');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Connect to Redis
redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (err) => {
  console.warn('❌ Redis client error:', err.message);
});

redisClient.on('end', () => {
  console.log('Redis client disconnected');
});

// Initialize connection
redisClient.connect().catch(() => {
  console.warn('Redis connection failed. Caching will be disabled.');
});

// Cache utility functions
export const cache = {
  // Get data from cache
  get: async (key) => {
    try {
      if (!redisClient.isOpen) return null;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  },

  // Set data in cache
  set: async (key, data, ttl = 300) => {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  },

  // Delete data from cache
  del: async (key) => {
    try {
      if (!redisClient.isOpen) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  },

  // Delete multiple keys with pattern
  delPattern: async (pattern) => {
    try {
      if (!redisClient.isOpen) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.warn('Cache delete pattern error:', error.message);
      return false;
    }
  },

  // Check if cache is available
  isAvailable: () => redisClient.isOpen,

  // Generate cache key
  generateKey: (prefix, ...params) => {
    const keyParts = [prefix, ...params.filter(p => p !== undefined && p !== null)];
    return keyParts.join(':');
  }
};

// Cache middleware for API responses
export const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : cache.generateKey('api', req.path, JSON.stringify(req.query));

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response
        cache.set(cacheKey, data, ttl).then(() => {
          console.log(`Cached: ${cacheKey}`);
        }).catch(err => {
          console.warn('Failed to cache response:', err.message);
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

export default cache;
