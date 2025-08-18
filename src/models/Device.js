const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Device type is required'],
    enum: ['light', 'thermostat', 'camera', 'sensor', 'smart_meter', 'switch', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'offline'],
    default: 'active'
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Device owner is required']
  },
  last_active_at: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
deviceSchema.index({ owner_id: 1, type: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ last_active_at: 1 });

// Virtual for device age
deviceSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to update last active time
deviceSchema.methods.updateHeartbeat = function(status = 'active') {
  this.last_active_at = new Date();
  this.status = status;
  this.isOnline = status === 'active';
  return this.save();
};

// Method to check if device is inactive
deviceSchema.methods.isInactive = function() {
  if (!this.last_active_at) return true;
  
  const hoursSinceLastActive = (Date.now() - this.last_active_at.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastActive > parseInt(process.env.DEVICE_INACTIVITY_THRESHOLD || 24);
};

// Ensure virtual fields are serialized
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Device', deviceSchema);
