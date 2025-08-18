const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'Device ID is required']
  },
  event: {
    type: String,
    required: [true, 'Event type is required'],
    trim: true,
    maxlength: [100, 'Event type cannot exceed 100 characters']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Event value is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  source: {
    type: String,
    enum: ['device', 'system', 'user'],
    default: 'device'
  }
}, {
  timestamps: true
});

// Index for better query performance
logSchema.index({ device_id: 1, timestamp: -1 });
logSchema.index({ event: 1 });
logSchema.index({ timestamp: -1 });
logSchema.index({ severity: 1 });

// Compound index for efficient range queries
logSchema.index({ device_id: 1, event: 1, timestamp: -1 });

// Method to get formatted log entry
logSchema.methods.toLogEntry = function() {
  return {
    id: this._id,
    event: this.event,
    value: this.value,
    timestamp: this.timestamp,
    severity: this.severity,
    source: this.source,
    metadata: Object.fromEntries(this.metadata)
  };
};

// Static method to get aggregated usage data
logSchema.statics.getAggregatedUsage = async function(deviceId, range = '24h') {
  const now = new Date();
  let startDate;

  switch (range) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
  }

  const logs = await this.find({
    device_id: deviceId,
    event: 'units_consumed',
    timestamp: { $gte: startDate }
  });

  const totalUnits = logs.reduce((sum, log) => {
    const value = parseFloat(log.value) || 0;
    return sum + value;
  }, 0);

  return {
    device_id: deviceId,
    range: range,
    total_units: totalUnits,
    log_count: logs.length,
    start_date: startDate,
    end_date: now
  };
};

module.exports = mongoose.model('Log', logSchema);
