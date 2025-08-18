const Joi = require('joi');

const createLogSchema = Joi.object({
  event: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Event type must be at least 1 character long',
      'string.max': 'Event type cannot exceed 100 characters',
      'any.required': 'Event type is required'
    }),
  
  value: Joi.any()
    .required()
    .messages({
      'any.required': 'Event value is required'
    }),
  
  severity: Joi.string()
    .valid('info', 'warning', 'error', 'critical')
    .default('info')
    .messages({
      'any.only': 'Severity must be one of: info, warning, error, critical'
    }),
  
  source: Joi.string()
    .valid('device', 'system', 'user')
    .default('device')
    .messages({
      'any.only': 'Source must be one of: device, system, user'
    }),
  
  metadata: Joi.object().optional()
});

const logQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  event: Joi.string().optional(),
  
  severity: Joi.string()
    .valid('info', 'warning', 'error', 'critical')
    .optional(),
  
  startDate: Joi.date().optional(),
  
  endDate: Joi.date().optional()
});

const usageQuerySchema = Joi.object({
  range: Joi.string()
    .valid('1h', '24h', '7d', '30d')
    .default('24h')
    .messages({
      'any.only': 'Range must be one of: 1h, 24h, 7d, 30d'
    })
});

module.exports = {
  createLogSchema,
  logQuerySchema,
  usageQuerySchema
};
