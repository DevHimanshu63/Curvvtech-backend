const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const jwt = require('jsonwebtoken');

// POST /auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account'
    });
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login and reset login attempts
    await user.updateLastLogin();

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: userResponse._id,
        name: userResponse.name,
        email: userResponse.email,
        role: userResponse.role,
        lastLogin: userResponse.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

// POST /auth/refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user and verify refresh token exists
    const user = await User.findByRefreshToken(refreshToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(newRefreshToken);

    // Blacklist old refresh token
    const decodedOld = jwt.decode(refreshToken);
    if (decodedOld && decodedOld.exp) {
      await TokenBlacklist.addToBlacklist(
        refreshToken,
        user._id,
        'refresh',
        new Date(decodedOld.exp * 1000),
        'refresh'
      );
    }

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Tokens refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error refreshing tokens'
    });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;
    const userId = req.user._id;

    const promises = [];

    // Blacklist access token
    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.exp) {
        promises.push(
          TokenBlacklist.addToBlacklist(
            accessToken,
            userId,
            'access',
            new Date(decoded.exp * 1000),
            'logout'
          )
        );
      }
    }

    // Blacklist refresh token
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.exp) {
        promises.push(
          TokenBlacklist.addToBlacklist(
            refreshToken,
            userId,
            'refresh',
            new Date(decoded.exp * 1000),
            'logout'
          )
        );
      }
      
      // Remove refresh token from user document
      promises.push(req.user.removeRefreshToken(refreshToken));
    }

    await Promise.all(promises);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// POST /auth/logout-all
const logoutAll = async (req, res) => {
  try {
    const userId = req.user._id;

    // Remove all refresh tokens for the user
    req.user.refreshTokens = [];
    await req.user.save();

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// GET /auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// PUT /auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile
};
