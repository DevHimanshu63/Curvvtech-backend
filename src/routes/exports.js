const express = require('express');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { exportJobSchema, exportOptionsSchema } = require('../validations/export');
const {
  createExportJob,
  getExportJobStatus,
  downloadExport,
  getExportHistory
} = require('../controllers/exportController');

const router = express.Router();

// Apply authentication to all export routes
router.use(authenticateToken);

// POST /exports/jobs - Create export job
router.post('/jobs', validate(exportJobSchema), createExportJob);

// GET /exports/jobs/:jobId - Get export job status
router.get('/jobs/:jobId', getExportJobStatus);

// GET /exports/history - Get export history
router.get('/history', getExportHistory);

// GET /exports/download/:fileName - Download export file
router.get('/download/:fileName', downloadExport);

module.exports = router;
