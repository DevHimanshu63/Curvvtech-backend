const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { 
  createDeviceSchema, 
  updateDeviceSchema, 
  heartbeatSchema, 
  deviceQuerySchema 
} = require('../validations/device');
const {
  createDevice,
  getDevices,
  updateDevice,
  deleteDevice,
  updateHeartbeat
} = require('../controllers/deviceController');

const router = express.Router();

// Apply authentication to all device routes
router.use(authenticateToken);

// POST /devices - Register new device
router.post('/', validate(createDeviceSchema), createDevice);

// GET /devices - List devices with filtering
router.get('/', validateQuery(deviceQuerySchema), getDevices);

// PATCH /devices/:id - Update device details
router.patch('/:id', validate(updateDeviceSchema), updateDevice);

// DELETE /devices/:id - Remove device
router.delete('/:id', deleteDevice);

// POST /devices/:id/heartbeat - Update device heartbeat
router.post('/:id/heartbeat', validate(heartbeatSchema), updateHeartbeat);

module.exports = router;
