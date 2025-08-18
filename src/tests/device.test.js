const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Device = require('../models/Device');

describe('Device Management Endpoints', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test_smart_device_platform');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Device.deleteMany({});

    // Create test user and get auth token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123'
    };

    await request(app)
      .post('/auth/signup')
      .send(userData);

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.token;
    testUser = loginResponse.body.user;
  });

  describe('POST /devices', () => {
    it('should create a new device successfully', async () => {
      const deviceData = {
        name: 'Living Room Light',
        type: 'light',
        status: 'active'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.device.name).toBe(deviceData.name);
      expect(response.body.device.type).toBe(deviceData.type);
      expect(response.body.device.status).toBe(deviceData.status);
      expect(response.body.device.owner_id).toBe(testUser.id);
    });

    it('should return error without authentication', async () => {
      const deviceData = {
        name: 'Living Room Light',
        type: 'light'
      };

      const response = await request(app)
        .post('/devices')
        .send(deviceData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should validate device type', async () => {
      const deviceData = {
        name: 'Test Device',
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Device type');
    });
  });

  describe('GET /devices', () => {
    beforeEach(async () => {
      // Create test devices
      const devices = [
        { name: 'Light 1', type: 'light', status: 'active' },
        { name: 'Thermostat 1', type: 'thermostat', status: 'active' },
        { name: 'Light 2', type: 'light', status: 'inactive' }
      ];

      for (const device of devices) {
        await request(app)
          .post('/devices')
          .set('Authorization', `Bearer ${authToken}`)
          .send(device);
      }
    });

    it('should return all devices for user', async () => {
      const response = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter devices by type', async () => {
      const response = await request(app)
        .get('/devices?type=light')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(2);
      response.body.devices.forEach(device => {
        expect(device.type).toBe('light');
      });
    });

    it('should filter devices by status', async () => {
      const response = await request(app)
        .get('/devices?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(2);
      response.body.devices.forEach(device => {
        expect(device.status).toBe('active');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/devices?limit=2&page=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });
  });

  describe('PATCH /devices/:id', () => {
    let deviceId;

    beforeEach(async () => {
      // Create a test device
      const deviceData = {
        name: 'Test Device',
        type: 'light',
        status: 'active'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);

      deviceId = response.body.device.id;
    });

    it('should update device successfully', async () => {
      const updateData = {
        name: 'Updated Device Name',
        status: 'inactive'
      };

      const response = await request(app)
        .patch(`/devices/${deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device.name).toBe(updateData.name);
      expect(response.body.device.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent device', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .patch(`/devices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Device not found');
    });
  });

  describe('DELETE /devices/:id', () => {
    let deviceId;

    beforeEach(async () => {
      // Create a test device
      const deviceData = {
        name: 'Test Device',
        type: 'light',
        status: 'active'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);

      deviceId = response.body.device.id;
    });

    it('should delete device successfully', async () => {
      const response = await request(app)
        .delete(`/devices/${deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device deleted successfully');

      // Verify device is deleted
      const devices = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(devices.body.devices).toHaveLength(0);
    });

    it('should return 404 for non-existent device', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/devices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Device not found');
    });
  });

  describe('POST /devices/:id/heartbeat', () => {
    let deviceId;

    beforeEach(async () => {
      // Create a test device
      const deviceData = {
        name: 'Test Device',
        type: 'light',
        status: 'active'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData);

      deviceId = response.body.device.id;
    });

    it('should update device heartbeat successfully', async () => {
      const heartbeatData = {
        status: 'active'
      };

      const response = await request(app)
        .post(`/devices/${deviceId}/heartbeat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(heartbeatData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device heartbeat recorded');
      expect(response.body.last_active_at).toBeDefined();
    });

    it('should validate heartbeat status', async () => {
      const heartbeatData = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .post(`/devices/${deviceId}/heartbeat`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(heartbeatData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Status');
    });
  });
});
