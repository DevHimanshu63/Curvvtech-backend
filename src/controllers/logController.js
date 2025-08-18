const Log = require('../models/Log');
const Device = require('../models/Device');

// POST /devices/:id/logs - Create log entry
const createLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { event, value, severity, source, metadata } = req.body;

    // Verify device ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Create log entry
    const log = new Log({
      device_id: id,
      event,
      value,
      severity: severity || 'info',
      source: source || 'device',
      metadata: metadata || {},
      timestamp: new Date()
    });

    await log.save();

    res.status(201).json({
      success: true,
      log: log.toLogEntry()
    });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating log entry'
    });
  }
};

// GET /devices/:id/logs - Get device logs
const getLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { 
      limit = 10, 
      page = 1, 
      event, 
      severity, 
      startDate, 
      endDate 
    } = req.query;

    // Verify device ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Build query
    const query = { device_id: id };
    if (event) query.event = event;
    if (severity) query.severity = severity;
    
    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Log.countDocuments(query);

    // Format logs
    const formattedLogs = logs.map(log => log.toLogEntry());

    res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs'
    });
  }
};

// GET /devices/:id/usage - Get aggregated usage
const getUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { range = '24h' } = req.query;

    // Verify device ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get aggregated usage data
    const usageData = await Log.getAggregatedUsage(id, range);

    // Format response based on device type
    let response = {
      success: true,
      device_id: id,
      range: range,
      total_units: usageData.total_units,
      log_count: usageData.log_count,
      start_date: usageData.start_date,
      end_date: usageData.end_date
    };

    // Add device-specific metrics
    if (device.type === 'smart_meter') {
      response.total_units_last_24h = usageData.total_units;
    }

    res.json(response);
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage data'
    });
  }
};

module.exports = {
  createLog,
  getLogs,
  getUsage
};
