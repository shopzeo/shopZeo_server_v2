const jwt = require('jsonwebtoken');
const UserAuthService = require('../services/userAuthService');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user info to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.userToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopzeo-secret-key');
    
    // Get user from database
    const user = await UserAuthService.getUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please complete verification first.'
      });
    }

    // Add user info to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Role-based Access Control Middleware
 * Checks if user has required role(s)
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Convert single role to array
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const requireAdmin = requireRole('admin');

/**
 * Vendor-only middleware
 */
const requireVendor = requireRole('vendor');

/**
 * Customer-only middleware
 */
const requireCustomer = requireRole('customer');

/**
 * Delivery-only middleware
 */
const requireDelivery = requireRole('delivery');

/**
 * Admin or Vendor middleware
 */
const requireAdminOrVendor = requireRole(['admin', 'vendor']);

/**
 * Admin, Vendor, or Customer middleware
 */
const requireAdminVendorOrCustomer = requireRole(['admin', 'vendor', 'customer']);

/**
 * Optional Authentication Middleware
 * Adds user info to req.user if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.userToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopzeo-secret-key');
      const user = await UserAuthService.getUserById(decoded.id);
      
      if (user && user.is_active && user.is_verified) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

/**
 * Rate Limiting Middleware (Basic Implementation)
 * In production, use express-rate-limit or Redis-based rate limiting
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(ip)) {
      const userRequests = requests.get(ip).filter(time => time > windowStart);
      requests.set(ip, userRequests);
    }

    const userRequests = requests.get(ip) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    userRequests.push(now);
    requests.set(ip, userRequests);

    next();
  };
};

/**
 * Validate User Ownership Middleware
 * Ensures user can only access their own resources
 */
const validateOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireVendor,
  requireCustomer,
  requireDelivery,
  requireAdminOrVendor,
  requireAdminVendorOrCustomer,
  optionalAuth,
  rateLimit,
  validateOwnership
};