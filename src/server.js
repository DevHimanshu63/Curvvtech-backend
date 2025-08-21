const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const redisClient = require('./config/redis');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const logRoutes = require('./routes/logs');
const exportRoutes = require('./routes/exports');
const { errorHandler } = require('./middleware/errorHandler');
const { performanceMonitor } = require('./middleware/cache');
const { setupCronJobs } = require('./services/cronService');
const webSocketService = require('./services/websocketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Performance monitoring
app.use(performanceMonitor);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics')
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for exports
app.use('/exports', express.static(process.env.UPLOAD_PATH || './uploads'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      success: true,
      message: 'Smart Device Management Platform is running',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
        websocket: 'unknown'
      }
    };

    // Check database connection
    try {
      const mongoose = require('mongoose');
      healthStatus.services.database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    } catch (error) {
      healthStatus.services.database = 'error';
    }

    // Check Redis connection
    try {
      healthStatus.services.redis = redisClient.isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      healthStatus.services.redis = 'error';
    }

    // Check WebSocket status
    try {
      healthStatus.services.websocket = webSocketService.io ? 'running' : 'stopped';
      healthStatus.websocket = {
        connectedUsers: webSocketService.getConnectedUsersCount(),
        deviceSubscriptions: Object.keys(webSocketService.getAllDeviceSubscriptions()).length
      };
    } catch (error) {
      healthStatus.services.websocket = 'error';
    }

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    websocket: {
      connectedUsers: webSocketService.getConnectedUsersCount(),
      deviceSubscriptions: webSocketService.getAllDeviceSubscriptions()
    },
    cache: {
      redisConnected: redisClient.isConnected
    }
  };

  res.json(metrics);
});

// API routes
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/devices', logRoutes);
app.use('/exports', exportRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Connected to Redis');

    // Initialize WebSocket service
    webSocketService.initialize(server);
    console.log('✅ WebSocket service initialized');

    // Setup cron jobs
    setupCronJobs();
    console.log('✅ Cron jobs initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  try {
    await redisClient.disconnect();
    console.log('✅ Redis disconnected');
    
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  try {
    await redisClient.disconnect();
    console.log('✅ Redis disconnected');
    
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();

module.exports = app;
