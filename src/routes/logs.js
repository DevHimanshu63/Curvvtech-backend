const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { cacheMiddleware, cacheKeys } = require('../middleware/cache');
const { 
  createLogSchema, 
  logQuerySchema, 
  usageQuerySchema 
} = require('../validations/log');
const {
  createLog,
  getLogs,
  getUsage
} = require('../controllers/logController');

const router = express.Router();

// Apply authentication to all log routes
router.use(authenticateToken);

// POST /devices/:id/logs - Create log entry
router.post('/:id/logs', validate(createLogSchema), createLog);

// GET /devices/:id/logs - Fetch device logs (cached for 5 minutes)
router.get('/:id/logs', 
  validateQuery(logQuerySchema), 
  cacheMiddleware(300, cacheKeys.deviceLogs),
  getLogs
);

// GET /devices/:id/usage - Get aggregated usage (cached for 5 minutes)
router.get('/:id/usage', 
  validateQuery(usageQuerySchema), 
  cacheMiddleware(parseInt(process.env.CACHE_TTL_ANALYTICS) || 300, cacheKeys.analytics),
  getUsage
);

module.exports = router;
