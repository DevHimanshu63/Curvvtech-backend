const express = require('express');
const { signupSchema, loginSchema } = require('../validations/auth');
const { validate } = require('../middleware/validate');
const { signup, login } = require('../controllers/authController');

const router = express.Router();

// POST /auth/signup - Create new user account
router.post('/signup', validate(signupSchema), signup);

// POST /auth/login - Login user
router.post('/login', validate(loginSchema), login);

module.exports = router;
