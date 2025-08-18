const Joi = require('joi');

const createDeviceSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Device name must be at least 1 character long',
      'string.max': 'Device name cannot exceed 100 characters',
      'any.required': 'Device name is required'
    }),
  
  type: Joi.string()
    .valid('light', 'thermostat', 'camera', 'sensor', 'smart_meter', 'switch', 'other')
    .required()
    .messages({
      'any.only': 'Device type must be one of: light, thermostat, camera, sensor, smart_meter, switch, other',
      'any.required': 'Device type is required'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance', 'offline')
    .default('active')
    .messages({
      'any.only': 'Status must be one of: active, inactive, maintenance, offline'
    }),
  
  location: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Location cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  metadata: Joi.object().optional()
});

const updateDeviceSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Device name must be at least 1 character long',
      'string.max': 'Device name cannot exceed 100 characters'
    }),
  
  type: Joi.string()
    .valid('light', 'thermostat', 'camera', 'sensor', 'smart_meter', 'switch', 'other')
    .optional()
    .messages({
      'any.only': 'Device type must be one of: light, thermostat, camera, sensor, smart_meter, switch, other'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance', 'offline')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, maintenance, offline'
    }),
  
  location: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Location cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  metadata: Joi.object().optional()
});

const heartbeatSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance', 'offline')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, inactive, maintenance, offline',
      'any.required': 'Status is required'
    })
});

const deviceQuerySchema = Joi.object({
  type: Joi.string()
    .valid('light', 'thermostat', 'camera', 'sensor', 'smart_meter', 'switch', 'other')
    .optional(),
  
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance', 'offline')
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
});

module.exports = {
  createDeviceSchema,
  updateDeviceSchema,
  heartbeatSchema,
  deviceQuerySchema
};
