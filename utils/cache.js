import redis from 'redis';

// Redis client configuration
let redisClient = null;
let isRedisConnected = false;

// Only initialize Redis if REDIS_URL is provided
if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true
      }
    });

    // Connect to Redis with timeout
    redisClient.on('connect', () => {
      console.log('✅ Redis client connected');
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      console.warn('❌ Redis client error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('end', () => {
      console.log('Redis client disconnected');
      isRedisConnected = false;
    });

    // Initialize connection with timeout
    const connectWithTimeout = async () => {
      try {
        await Promise.race([
          redisClient.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('Redis connection failed. Caching will be disabled:', error.message);
        isRedisConnected = false;
      }
    };

    connectWithTimeout();
  } catch (error) {
    console.warn('Failed to create Redis client. Caching will be disabled:', error.message);
    isRedisConnected = false;
  }
} else {
  console.warn('No REDIS_URL provided. Caching will be disabled.');
}

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

// Cache utility functions
export const cache = {
  // Get data from cache
  get: async (key) => {
    try {
      if (!isRedisConnected || !redisClient) return null;
      const data = await redisClient.get(key);
      if (data) {
        cacheStats.hits++;
        return JSON.parse(data);
      } else {
        cacheStats.misses++;
        return null;
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
      cacheStats.misses++;
      return null;
    }
  },

  // Set data in cache
  set: async (key, data, ttl = 300) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      cacheStats.sets++;
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  },

  // Delete data from cache
  del: async (key) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      const result = await redisClient.del(key);
      cacheStats.deletes++;
      return result > 0;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  },

  // Delete multiple keys with pattern
  delPattern: async (pattern) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        cacheStats.deletes += keys.length;
      }
      return true;
    } catch (error) {
      console.warn('Cache delete pattern error:', error.message);
      return false;
    }
  },

  // Get multiple keys at once
  mget: async (keys) => {
    try {
      if (!isRedisConnected || !redisClient) return keys.map(() => null);
      const values = await redisClient.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.warn('Cache mget error:', error.message);
      return keys.map(() => null);
    }
  },

  // Set multiple key-value pairs
  mset: async (keyValuePairs, ttl = 300) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      const pipeline = redisClient.multi();
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      });
      await pipeline.exec();
      cacheStats.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      console.warn('Cache mset error:', error.message);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Cache exists error:', error.message);
      return false;
    }
  },

  // Set expiration for key
  expire: async (key, ttl) => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      const result = await redisClient.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.warn('Cache expire error:', error.message);
      return false;
    }
  },

  // Flush all cache
  flush: async () => {
    try {
      if (!isRedisConnected || !redisClient) return false;
      await redisClient.flushAll();
      cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      return true;
    } catch (error) {
      console.warn('Cache flush error:', error.message);
      return false;
    }
  },

  // Get cache statistics
  getStats: () => ({
    ...cacheStats,
    hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
    isConnected: isRedisConnected
  }),

  // Check if cache is available
  isAvailable: () => isRedisConnected && redisClient,

  // Generate cache key
  generateKey: (prefix, ...params) => {
    const keyParts = [prefix, ...params.filter(p => p !== undefined && p !== null)];
    return keyParts.join(':');
  },

  // Cache key generators for common patterns
  keys: {
    product: (id) => `product:${id}`,
    products: (filters) => `products:${JSON.stringify(filters)}`,
    featuredProducts: () => 'products:featured',
    trendingProducts: () => 'products:trending',
    bestSellers: () => 'products:best-sellers',
    categories: () => 'categories:all',
    brands: () => 'brands:all',
    user: (id) => `user:${id}`,
    cart: (userId) => `cart:${userId}`,
    order: (id) => `order:${id}`,
    orders: (userId, filters) => `orders:${userId}:${JSON.stringify(filters)}`
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
