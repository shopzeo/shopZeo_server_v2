const { body, validationResult } = require('express-validator');
const UserAuthService = require('../services/userAuthService');

/**
 * Validation rules for signup
 */
const signupValidation = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['admin', 'vendor', 'customer', 'delivery'])
    .withMessage('Invalid role specified')
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

/**
 * Validation rules for OTP verification
 */
const otpValidation = [
  body('user_id')
    .isUUID()
    .withMessage('Valid user ID is required'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

/**
 * User signup API
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { first_name, last_name, email, phone, password, role } = req.body;

    // Validate that either email+password OR phone is provided
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    let result;

    if (email && password) {
      // Email + Password signup
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required for email signup'
        });
      }

      result = await UserAuthService.signupWithEmail({
        first_name,
        last_name,
        email,
        phone,
        password,
        role
      });
    } else if (phone) {
      // Phone + OTP signup
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required for phone signup'
        });
      }

      result = await UserAuthService.signupWithPhone({
        first_name,
        last_name,
        email,
        phone,
        role
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid signup method. Use email+password or phone number.'
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * User login API
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, phone, password } = req.body;

    let result;

    if (email && password) {
      // Email + Password login
      result = await UserAuthService.loginWithEmail(email, password);
    } else if (phone) {
      // Phone + OTP login
      result = await UserAuthService.loginWithPhone(phone);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either email+password or phone number'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message.includes('Invalid credentials') || 
        error.message.includes('not found') ||
        error.message.includes('deactivated') ||
        error.message.includes('requires phone verification')) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * OTP verification API
 * POST /api/auth/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id, otp } = req.body;

    const result = await UserAuthService.verifyOTP(user_id, otp);

    res.json(result);
  } catch (error) {
    console.error('OTP verification error:', error);
    
    if (error.message.includes('Invalid or expired OTP') ||
        error.message.includes('User not found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user profile API
 * GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserAuthService.getUserById(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_verified: user.is_verified,
          email_verified_at: user.email_verified_at,
          phone_verified_at: user.phone_verified_at,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile API
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Remove sensitive fields
    const { password, email, phone, role, ...safeUpdateData } = updateData;

    const result = await UserAuthService.updateProfile(userId, safeUpdateData);

    res.json(result);
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password API
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const userId = req.user.id;
    const result = await UserAuthService.changePassword(userId, currentPassword, newPassword);

    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.message.includes('User not found') ||
        error.message.includes('Current password is incorrect') ||
        error.message.includes('does not have a password')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout API
 * POST /api/auth/logout
 */
exports.logout = (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. The server doesn't need to do anything.
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

/**
 * Refresh token API (optional)
 * POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserAuthService.getUserById(userId);

    // Generate new token
    const newToken = UserAuthService.generateJWT(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_verified: user.is_verified
        }
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export validation rules for use in routes
exports.signupValidation = signupValidation;
exports.loginValidation = loginValidation;
exports.otpValidation = otpValidation;
