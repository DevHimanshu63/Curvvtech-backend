const csvWriter = require('csv-writer').createObjectCsvWriter;
const archiver = require('archiver');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const Device = require('../models/Device');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

class ExportService {
  constructor() {
    this.exportJobs = new Map(); // jobId -> job status
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  // Create export job
  async createExportJob(userId, type, options) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      userId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      options,
      result: null,
      error: null
    };

    this.exportJobs.set(jobId, job);
    
    // Start processing in background
    this.processExportJob(jobId);
    
    return jobId;
  }

  // Process export job
  async processExportJob(jobId) {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 10;

      let result;
      switch (job.type) {
        case 'device-logs-csv':
          result = await this.exportDeviceLogsCSV(job.userId, job.options);
          break;
        case 'device-logs-json':
          result = await this.exportDeviceLogsJSON(job.userId, job.options);
          break;
        case 'usage-report':
          result = await this.generateUsageReport(job.userId, job.options);
          break;
        case 'device-summary':
          result = await this.generateDeviceSummary(job.userId, job.options);
          break;
        default:
          throw new Error(`Unknown export type: ${job.type}`);
      }

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      
      // Simulate email notification
      console.log(`📧 Export completed for user ${job.userId}: ${job.type}`);
      console.log(`📁 File available at: ${result.filePath}`);

    } catch (error) {
      console.error('Export job error:', error);
      job.status = 'failed';
      job.error = error.message;
    }
  }

  // Get job status
  getJobStatus(jobId) {
    return this.exportJobs.get(jobId) || null;
  }

  // Export device logs as CSV
  async exportDeviceLogsCSV(userId, options) {
    const { deviceId, startDate, endDate, format = 'csv' } = options;
    
    // Verify device ownership
    const device = await Device.findOne({ _id: deviceId, owner_id: userId });
    if (!device) {
      throw new Error('Device not found or access denied');
    }

    // Build query
    const query = { device_id: deviceId };
    if (startDate) query.timestamp = { $gte: new Date(startDate) };
    if (endDate) {
      if (!query.timestamp) query.timestamp = {};
      query.timestamp.$lte = new Date(endDate);
    }

    const logs = await Log.find(query).sort({ timestamp: -1 });

    // Create CSV file
    const fileName = `device-logs-${deviceId}-${moment().format('YYYY-MM-DD-HH-mm-ss')}.csv`;
    const filePath = path.join(this.uploadPath, fileName);

    const csvWriterInstance = csvWriter({
      path: filePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'event', title: 'Event' },
        { id: 'value', title: 'Value' },
        { id: 'severity', title: 'Severity' },
        { id: 'source', title: 'Source' }
      ]
    });

    const records = logs.map(log => ({
      timestamp: moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      event: log.event,
      value: log.value,
      severity: log.severity,
      source: log.source
    }));

    await csvWriterInstance.writeRecords(records);

    return {
      filePath,
      fileName,
      recordCount: records.length,
      fileSize: await this.getFileSize(filePath),
      downloadUrl: `/exports/${fileName}`
    };
  }

  // Export device logs as JSON
  async exportDeviceLogsJSON(userId, options) {
    const { deviceId, startDate, endDate } = options;
    
    // Verify device ownership
    const device = await Device.findOne({ _id: deviceId, owner_id: userId });
    if (!device) {
      throw new Error('Device not found or access denied');
    }

    // Build query
    const query = { device_id: deviceId };
    if (startDate) query.timestamp = { $gte: new Date(startDate) };
    if (endDate) {
      if (!query.timestamp) query.timestamp = {};
      query.timestamp.$lte = new Date(endDate);
    }

    const logs = await Log.find(query).sort({ timestamp: -1 });

    // Create JSON file
    const fileName = `device-logs-${deviceId}-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    const filePath = path.join(this.uploadPath, fileName);

    const exportData = {
      device: {
        id: device._id,
        name: device.name,
        type: device.type
      },
      exportInfo: {
        exportedAt: new Date().toISOString(),
        recordCount: logs.length,
        dateRange: { startDate, endDate }
      },
      logs: logs.map(log => log.toLogEntry())
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    return {
      filePath,
      fileName,
      recordCount: logs.length,
      fileSize: await this.getFileSize(filePath),
      downloadUrl: `/exports/${fileName}`
    };
  }

  // Generate usage report
  async generateUsageReport(userId, options) {
    const { deviceId, range = '24h' } = options;
    
    // Verify device ownership
    const device = await Device.findOne({ _id: deviceId, owner_id: userId });
    if (!device) {
      throw new Error('Device not found or access denied');
    }

    // Get usage data
    const usageData = await Log.getAggregatedUsage(deviceId, range);
    
    // Get detailed logs for the period
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
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const logs = await Log.find({
      device_id: deviceId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    // Generate chart data
    const chartData = this.generateChartData(logs, range);

    // Create report file
    const fileName = `usage-report-${deviceId}-${range}-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    const filePath = path.join(this.uploadPath, fileName);

    const report = {
      device: {
        id: device._id,
        name: device.name,
        type: device.type
      },
      reportInfo: {
        generatedAt: new Date().toISOString(),
        range,
        startDate,
        endDate: now
      },
      summary: {
        totalUnits: usageData.total_units,
        logCount: usageData.log_count,
        averagePerHour: usageData.total_units / (usageData.log_count || 1)
      },
      chartData,
      logs: logs.map(log => log.toLogEntry())
    };

    await fs.writeFile(filePath, JSON.stringify(report, null, 2));

    return {
      filePath,
      fileName,
      recordCount: logs.length,
      fileSize: await this.getFileSize(filePath),
      downloadUrl: `/exports/${fileName}`,
      summary: report.summary
    };
  }

  // Generate device summary
  async generateDeviceSummary(userId, options) {
    const { deviceId } = options;
    
    // Verify device ownership
    const device = await Device.findOne({ _id: deviceId, owner_id: userId });
    if (!device) {
      throw new Error('Device not found or access denied');
    }

    // Get device statistics
    const totalLogs = await Log.countDocuments({ device_id: deviceId });
    const recentLogs = await Log.find({ device_id: deviceId })
      .sort({ timestamp: -1 })
      .limit(100);

    const summary = {
      device: {
        id: device._id,
        name: device.name,
        type: device.type,
        status: device.status,
        lastActiveAt: device.last_active_at,
        createdAt: device.createdAt
      },
      statistics: {
        totalLogs,
        recentLogs: recentLogs.length,
        averageLogsPerDay: totalLogs / Math.max(1, Math.ceil((Date.now() - device.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
      },
      recentActivity: recentLogs.map(log => log.toLogEntry())
    };

    // Create summary file
    const fileName = `device-summary-${deviceId}-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    const filePath = path.join(this.uploadPath, fileName);

    await fs.writeFile(filePath, JSON.stringify(summary, null, 2));

    return {
      filePath,
      fileName,
      fileSize: await this.getFileSize(filePath),
      downloadUrl: `/exports/${fileName}`,
      summary: summary.statistics
    };
  }

  // Generate chart data for usage reports
  generateChartData(logs, range) {
    const chartData = {
      labels: [],
      datasets: [{
        label: 'Usage',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };

    if (logs.length === 0) return chartData;

    // Group logs by time intervals
    const groupedData = {};
    const interval = this.getIntervalForRange(range);

    logs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      const key = this.getTimeKey(timestamp, interval);
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      
      groupedData[key] += parseFloat(log.value) || 0;
    });

    // Sort by time and create chart data
    const sortedKeys = Object.keys(groupedData).sort();
    
    chartData.labels = sortedKeys.map(key => this.formatTimeKey(key, range));
    chartData.datasets[0].data = sortedKeys.map(key => groupedData[key]);

    return chartData;
  }

  getIntervalForRange(range) {
    switch (range) {
      case '1h': return 'minute';
      case '24h': return 'hour';
      case '7d': return 'day';
      case '30d': return 'day';
      default: return 'hour';
    }
  }

  getTimeKey(timestamp, interval) {
    switch (interval) {
      case 'minute':
        return moment(timestamp).format('YYYY-MM-DD-HH-mm');
      case 'hour':
        return moment(timestamp).format('YYYY-MM-DD-HH');
      case 'day':
        return moment(timestamp).format('YYYY-MM-DD');
      default:
        return moment(timestamp).format('YYYY-MM-DD-HH');
    }
  }

  formatTimeKey(key, range) {
    switch (range) {
      case '1h':
        return moment(key, 'YYYY-MM-DD-HH-mm').format('HH:mm');
      case '24h':
        return moment(key, 'YYYY-MM-DD-HH').format('HH:00');
      case '7d':
      case '30d':
        return moment(key, 'YYYY-MM-DD').format('MMM DD');
      default:
        return key;
    }
  }

  // Get file size
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  // Clean up old export files
  async cleanupOldExports(daysToKeep = 7) {
    try {
      const files = await fs.readdir(this.uploadPath);
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.uploadPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
    }
  }
}

const exportService = new ExportService();

module.exports = exportService;
