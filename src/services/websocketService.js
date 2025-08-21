const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.deviceSubscriptions = new Map(); // deviceId -> Set of userIds
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.WS_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupEventHandlers();
    
    console.log('✅ WebSocket server initialized');
  }

  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'access') {
          return next(new Error('Invalid token type'));
        }

        // Get user
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.user.email} (${socket.user._id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.user._id.toString(), socket);

      // Join user's personal room
      socket.join(`user:${socket.user._id}`);

      // Handle device subscriptions
      socket.on('subscribe-device', (deviceId) => {
        this.subscribeToDevice(socket.user._id.toString(), deviceId);
        socket.join(`device:${deviceId}`);
        console.log(`📡 User ${socket.user.email} subscribed to device ${deviceId}`);
      });

      socket.on('unsubscribe-device', (deviceId) => {
        this.unsubscribeFromDevice(socket.user._id.toString(), deviceId);
        socket.leave(`device:${deviceId}`);
        console.log(`📡 User ${socket.user.email} unsubscribed from device ${deviceId}`);
      });

      // Handle heartbeat updates
      socket.on('device-heartbeat', (data) => {
        this.broadcastDeviceHeartbeat(data.deviceId, data.status, data.lastActiveAt);
      });

      // Handle device status updates
      socket.on('device-status-update', (data) => {
        this.broadcastDeviceStatusUpdate(data.deviceId, data.status, data.metadata);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.user.email} (${socket.user._id})`);
        this.connectedUsers.delete(socket.user._id.toString());
        this.cleanupUserSubscriptions(socket.user._id.toString());
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Smart Device Management Platform',
        userId: socket.user._id,
        timestamp: new Date().toISOString()
      });
    });
  }

  subscribeToDevice(userId, deviceId) {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
    }
    this.deviceSubscriptions.get(deviceId).add(userId);
  }

  unsubscribeFromDevice(userId, deviceId) {
    if (this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.get(deviceId).delete(userId);
      
      // Clean up empty subscriptions
      if (this.deviceSubscriptions.get(deviceId).size === 0) {
        this.deviceSubscriptions.delete(deviceId);
      }
    }
  }

  cleanupUserSubscriptions(userId) {
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.deviceSubscriptions.delete(deviceId);
      }
    }
  }

  // Broadcast device heartbeat to subscribed users
  broadcastDeviceHeartbeat(deviceId, status, lastActiveAt) {
    const event = {
      type: 'device-heartbeat',
      deviceId,
      status,
      lastActiveAt,
      timestamp: new Date().toISOString()
    };

    this.io.to(`device:${deviceId}`).emit('device-update', event);
    console.log(`💓 Broadcasted heartbeat for device ${deviceId}: ${status}`);
  }

  // Broadcast device status update to subscribed users
  broadcastDeviceStatusUpdate(deviceId, status, metadata = {}) {
    const event = {
      type: 'device-status-update',
      deviceId,
      status,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.io.to(`device:${deviceId}`).emit('device-update', event);
    console.log(`📊 Broadcasted status update for device ${deviceId}: ${status}`);
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const socket = this.connectedUsers.get(userId.toString());
    if (socket) {
      socket.emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast to all connected users
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get device subscribers count
  getDeviceSubscribersCount(deviceId) {
    return this.deviceSubscriptions.get(deviceId)?.size || 0;
  }

  // Get all device subscriptions
  getAllDeviceSubscriptions() {
    const subscriptions = {};
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      subscriptions[deviceId] = Array.from(subscribers);
    }
    return subscriptions;
  }
}

const webSocketService = new WebSocketService();

module.exports = webSocketService;
