const redisClient = require('../config/redis');

// Cache middleware for API responses
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : generateCacheKey(req);
      
      // Try to get from cache
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        console.log(`✅ Cache HIT: ${cacheKey}`);
        
        return res.json({
          ...cachedData,
          cached: true,
          cacheTimestamp: new Date().toISOString()
        });
      }

      // Cache miss - store original send method
      const originalSend = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Restore original method
        res.json = originalSend;
        
        // Add cache miss header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        console.log(`❌ Cache MISS: ${cacheKey}`);
        
        // Cache the response
        if (data && data.success !== false) {
          redisClient.set(cacheKey, data, ttl);
        }
        
        // Send response
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Generate cache key based on request
const generateCacheKey = (req) => {
  const { url, query, user } = req;
  const userId = user ? user._id : 'anonymous';
  const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '';
  
  return `${userId}:${url}:${queryString}`;
};

// Cache invalidation middleware
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      await redisClient.invalidatePattern(pattern);
      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
};

// Device-specific cache invalidation
const invalidateDeviceCache = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id) {
      await redisClient.invalidateDeviceCache(id);
    }
    next();
  } catch (error) {
    console.error('Device cache invalidation error:', error);
    next();
  }
};

// User-specific cache invalidation
const invalidateUserCache = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (userId) {
      await redisClient.invalidateUserCache(userId);
    }
    next();
  } catch (error) {
    console.error('User cache invalidation error:', error);
    next();
  }
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    // Log slow requests
    const slowThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000;
    if (duration > slowThreshold) {
      console.warn(`🐌 Slow request: ${method} ${url} - ${duration}ms - Status: ${statusCode}`);
    }
    
    // Log performance metrics
    if (process.env.ENABLE_PERFORMANCE_LOGGING === 'true') {
      console.log(`📊 ${method} ${url} - ${duration}ms - Status: ${statusCode}`);
    }
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

// Cache key generators for specific endpoints
const cacheKeys = {
  // Device listing cache key
  deviceList: (req) => {
    const { type, status, page = 1, limit = 10 } = req.query;
    const userId = req.user ? req.user._id : 'anonymous';
    return `devices:list:${userId}:${type || 'all'}:${status || 'all'}:${page}:${limit}`;
  },
  
  // User profile cache key
  userProfile: (req) => {
    const userId = req.user ? req.user._id : req.params.id;
    return `user:${userId}:profile`;
  },
  
  // Device details cache key
  deviceDetails: (req) => {
    const { id } = req.params;
    return `device:${id}:details`;
  },
  
  // Analytics cache key
  analytics: (req) => {
    const { id } = req.params;
    const { range = '24h' } = req.query;
    return `analytics:device:${id}:${range}`;
  },
  
  // Device logs cache key
  deviceLogs: (req) => {
    const { id } = req.params;
    const { limit = 10, page = 1, event, severity } = req.query;
    return `logs:device:${id}:${limit}:${page}:${event || 'all'}:${severity || 'all'}`;
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateDeviceCache,
  invalidateUserCache,
  performanceMonitor,
  cacheKeys
};
