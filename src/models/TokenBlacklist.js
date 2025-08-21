const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['access', 'refresh'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Automatically delete expired tokens
  },
  reason: {
    type: String,
    enum: ['logout', 'refresh', 'security', 'admin'],
    default: 'logout'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
tokenBlacklistSchema.index({ token: 1 });
tokenBlacklistSchema.index({ userId: 1 });
tokenBlacklistSchema.index({ type: 1 });

// Static method to check if token is blacklisted
tokenBlacklistSchema.statics.isBlacklisted = async function(token) {
  const blacklistedToken = await this.findOne({ token });
  return !!blacklistedToken;
};

// Static method to add token to blacklist
tokenBlacklistSchema.statics.addToBlacklist = async function(token, userId, type, expiresAt, reason = 'logout') {
  try {
    await this.create({
      token,
      userId,
      type,
      expiresAt,
      reason
    });
    return true;
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
    return false;
  }
};

// Static method to clean expired tokens
tokenBlacklistSchema.statics.cleanExpired = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`🧹 Cleaned ${result.deletedCount} expired blacklisted tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning expired tokens:', error);
    return 0;
  }
};

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
