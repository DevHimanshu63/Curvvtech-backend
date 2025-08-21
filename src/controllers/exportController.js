const path = require('path');
const fs = require('fs').promises;
const exportService = require('../services/exportService');

// POST /exports/jobs - Create export job
const createExportJob = async (req, res) => {
  try {
    const { type, options } = req.body;
    const userId = req.user._id;

    // Create export job
    const jobId = await exportService.createExportJob(userId, type, options);

    res.status(202).json({
      success: true,
      message: 'Export job created successfully',
      jobId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Create export job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating export job'
    });
  }
};

// GET /exports/jobs/:jobId - Get export job status
const getExportJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    const job = exportService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Export job not found'
      });
    }

    // Ensure user can only access their own jobs
    if (job.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const response = {
      success: true,
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      options: job.options
    };

    if (job.status === 'completed' && job.result) {
      response.result = {
        fileName: job.result.fileName,
        recordCount: job.result.recordCount,
        fileSize: job.result.fileSize,
        downloadUrl: job.result.downloadUrl
      };
      
      if (job.result.summary) {
        response.summary = job.result.summary;
      }
    }

    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    res.json(response);
  } catch (error) {
    console.error('Get export job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export job status'
    });
  }
};

// GET /exports/history - Get export history
const getExportHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    // Get all jobs for the user
    const allJobs = Array.from(exportService.exportJobs.values())
      .filter(job => job.userId.toString() === userId.toString())
      .sort((a, b) => b.createdAt - a.createdAt);

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = allJobs.slice(startIndex, endIndex);

    const history = paginatedJobs.map(job => ({
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.status === 'completed' ? new Date() : null,
      options: job.options,
      result: job.status === 'completed' ? {
        fileName: job.result.fileName,
        recordCount: job.result.recordCount,
        fileSize: job.result.fileSize,
        downloadUrl: job.result.downloadUrl
      } : null,
      error: job.status === 'failed' ? job.error : null
    }));

    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allJobs.length,
        pages: Math.ceil(allJobs.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get export history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching export history'
    });
  }
};

// GET /exports/download/:fileName - Download export file
const downloadExport = async (req, res) => {
  try {
    const { fileName } = req.params;
    const userId = req.user._id;

    // Validate filename to prevent directory traversal
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Verify file belongs to user (check if it's in their job results)
    const userJobs = Array.from(exportService.exportJobs.values())
      .filter(job => job.userId.toString() === userId.toString());
    
    const hasAccess = userJobs.some(job => 
      job.result && job.result.fileName === fileName
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', getContentType(fileName));

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file'
    });
  }
};

// Helper function to determine content type
const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.csv':
      return 'text/csv';
    case '.json':
      return 'application/json';
    case '.zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
};

module.exports = {
  createExportJob,
  getExportJobStatus,
  getExportHistory,
  downloadExport
};
