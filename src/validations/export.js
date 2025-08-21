const Joi = require('joi');

const exportJobSchema = Joi.object({
  type: Joi.string()
    .valid('device-logs-csv', 'device-logs-json', 'usage-report', 'device-summary')
    .required()
    .messages({
      'any.only': 'Export type must be one of: device-logs-csv, device-logs-json, usage-report, device-summary',
      'any.required': 'Export type is required'
    }),
  
  options: Joi.object({
    deviceId: Joi.string()
      .required()
      .messages({
        'any.required': 'Device ID is required'
      }),
    
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'Start date must be a valid date'
      }),
    
    endDate: Joi.date()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.min': 'End date must be after start date'
      }),
    
    range: Joi.string()
      .valid('1h', '24h', '7d', '30d')
      .optional()
      .messages({
        'any.only': 'Range must be one of: 1h, 24h, 7d, 30d'
      }),
    
    format: Joi.string()
      .valid('csv', 'json')
      .optional()
      .messages({
        'any.only': 'Format must be one of: csv, json'
      })
  }).required()
});

const exportOptionsSchema = Joi.object({
  deviceId: Joi.string()
    .required()
    .messages({
      'any.required': 'Device ID is required'
    }),
  
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date'
    }),
  
  range: Joi.string()
    .valid('1h', '24h', '7d', '30d')
    .optional()
    .messages({
      'any.only': 'Range must be one of: 1h, 24h, 7d, 30d'
    }),
  
  format: Joi.string()
    .valid('csv', 'json')
    .optional()
    .messages({
      'any.only': 'Format must be one of: csv, json'
    })
});

module.exports = {
  exportJobSchema,
  exportOptionsSchema
};
