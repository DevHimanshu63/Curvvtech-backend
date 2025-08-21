const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { cacheMiddleware, invalidateDeviceCache, cacheKeys } = require('../middleware/cache');
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

// GET /devices - List devices with filtering (cached for 30 minutes)
router.get('/', 
  validateQuery(deviceQuerySchema), 
  cacheMiddleware(parseInt(process.env.CACHE_TTL_DEVICES) || 1800, cacheKeys.deviceList),
  getDevices
);

// PATCH /devices/:id - Update device details (invalidates cache)
router.patch('/:id', 
  validate(updateDeviceSchema), 
  invalidateDeviceCache,
  updateDevice
);

// DELETE /devices/:id - Remove device (invalidates cache)
router.delete('/:id', invalidateDeviceCache, deleteDevice);

// POST /devices/:id/heartbeat - Update device heartbeat (invalidates cache)
router.post('/:id/heartbeat', 
  validate(heartbeatSchema), 
  invalidateDeviceCache,
  updateHeartbeat
);

module.exports = router;
