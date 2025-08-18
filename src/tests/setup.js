// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/test_smart_device_platform';

// Increase timeout for tests
jest.setTimeout(10000);
