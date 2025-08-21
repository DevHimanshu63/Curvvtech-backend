const express = require('express');
const { signupSchema, loginSchema } = require('../validations/auth');
const { validate } = require('../middleware/validate');
const { 
  signup, 
  login, 
  refreshToken, 
  logout, 
  logoutAll, 
  getProfile, 
  updateProfile 
} = require('../controllers/authController');
const { 
  authenticateToken, 
  authenticateRefreshToken, 
  createAuthRateLimiter 
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = createAuthRateLimiter();

// POST /auth/signup - Create new user account
router.post('/signup', validate(signupSchema), signup);

// POST /auth/login - Login user (with rate limiting)
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /auth/refresh - Refresh access token
router.post('/refresh', validate(loginSchema), authenticateRefreshToken, refreshToken);

// POST /auth/logout - Logout user
router.post('/logout', authenticateToken, logout);

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all', authenticateToken, logoutAll);

// GET /auth/profile - Get user profile
router.get('/profile', authenticateToken, getProfile);

// PUT /auth/profile - Update user profile
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
