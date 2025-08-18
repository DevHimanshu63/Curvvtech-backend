const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
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

// GET /devices/:id/logs - Fetch device logs
router.get('/:id/logs', validateQuery(logQuerySchema), getLogs);

// GET /devices/:id/usage - Get aggregated usage
router.get('/:id/usage', validateQuery(usageQuerySchema), getUsage);

module.exports = router;
