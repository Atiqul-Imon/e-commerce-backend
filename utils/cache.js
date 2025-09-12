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

// Cache utility functions
export const cache = {
  // Get data from cache
  get: async (key) => {
    try {
      if (!isRedisConnected || !redisClient) return null;
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
      if (!isRedisConnected || !redisClient) return false;
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
      if (!isRedisConnected || !redisClient) return false;
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
      if (!isRedisConnected || !redisClient) return false;
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
  isAvailable: () => isRedisConnected && redisClient,

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
