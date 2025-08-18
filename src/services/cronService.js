const cron = require('node-cron');
const Device = require('../models/Device');
const moment = require('moment');

// Auto-deactivate devices that haven't sent heartbeat for more than 24 hours
const deactivateInactiveDevices = async () => {
  try {
    const inactivityThreshold = parseInt(process.env.DEVICE_INACTIVITY_THRESHOLD || 24);
    const cutoffTime = moment().subtract(inactivityThreshold, 'hours').toDate();

    const inactiveDevices = await Device.find({
      last_active_at: { $lt: cutoffTime },
      status: { $in: ['active', 'online'] }
    });

    if (inactiveDevices.length > 0) {
      const deviceIds = inactiveDevices.map(device => device._id);
      
      await Device.updateMany(
        { _id: { $in: deviceIds } },
        { 
          status: 'offline',
          isOnline: false
        }
      );

      console.log(`🔄 Auto-deactivated ${inactiveDevices.length} inactive devices`);
    }
  } catch (error) {
    console.error('❌ Error in deactivateInactiveDevices:', error);
  }
};

// Clean up old logs (older than 30 days)
const cleanupOldLogs = async () => {
  try {
    const cutoffDate = moment().subtract(30, 'days').toDate();
    
    const result = await require('../models/Log').deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} old log entries`);
    }
  } catch (error) {
    console.error('❌ Error in cleanupOldLogs:', error);
  }
};

// Health check for all devices
const deviceHealthCheck = async () => {
  try {
    const devices = await Device.find({ status: 'active' });
    
    for (const device of devices) {
      if (device.isInactive()) {
        device.status = 'offline';
        device.isOnline = false;
        await device.save();
        console.log(`⚠️ Device ${device.name} (${device._id}) marked as offline due to inactivity`);
      }
    }
  } catch (error) {
    console.error('❌ Error in deviceHealthCheck:', error);
  }
};

// Setup all cron jobs
const setupCronJobs = () => {
  // Run every hour - deactivate inactive devices
  cron.schedule('0 * * * *', () => {
    console.log('🕐 Running device deactivation check...');
    deactivateInactiveDevices();
  });

  // Run every 6 hours - device health check
  cron.schedule('0 */6 * * *', () => {
    console.log('🕐 Running device health check...');
    deviceHealthCheck();
  });

  // Run daily at 2 AM - cleanup old logs
  cron.schedule('0 2 * * *', () => {
    console.log('🕐 Running log cleanup...');
    cleanupOldLogs();
  });

  console.log('✅ Cron jobs scheduled successfully');
};

module.exports = {
  setupCronJobs,
  deactivateInactiveDevices,
  cleanupOldLogs,
  deviceHealthCheck
};
