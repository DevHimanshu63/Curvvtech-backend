const Device = require('../models/Device');

// POST /devices - Create new device
const createDevice = async (req, res) => {
  try {
    const { name, type, status, location, description, metadata } = req.body;
    const userId = req.user._id;

    const device = new Device({
      name,
      type,
      status: status || 'active',
      owner_id: userId,
      location,
      description,
      metadata: metadata || {}
    });

    await device.save();

    res.status(201).json({
      success: true,
      device: {
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        last_active_at: device.last_active_at,
        owner_id: device.owner_id
      }
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating device'
    });
  }
};

// GET /devices - Get devices with filtering
const getDevices = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { owner_id: userId };
    if (type) query.type = type;
    if (status) query.status = status;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const devices = await Device.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Device.countDocuments(query);

    res.json({
      success: true,
      devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching devices'
    });
  }
};

// PATCH /devices/:id - Update device
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    // Find device and ensure ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update device
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        device[key] = updateData[key];
      }
    });

    await device.save();

    res.json({
      success: true,
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating device'
    });
  }
};

// DELETE /devices/:id - Delete device
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find device and ensure ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    await Device.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting device'
    });
  }
};

// POST /devices/:id/heartbeat - Update device heartbeat
const updateHeartbeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    // Find device and ensure ownership
    const device = await Device.findOne({ _id: id, owner_id: userId });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update heartbeat
    await device.updateHeartbeat(status);

    res.json({
      success: true,
      message: 'Device heartbeat recorded',
      last_active_at: device.last_active_at
    });
  } catch (error) {
    console.error('Update heartbeat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating device heartbeat'
    });
  }
};

module.exports = {
  createDevice,
  getDevices,
  updateDevice,
  deleteDevice,
  updateHeartbeat
};
