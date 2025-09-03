const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/userAuth');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  
  next();
};

// Public admin login page (no auth required)
router.get('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Admin login endpoint',
    data: {
      endpoint: '/api/user-auth/login',
      required_fields: ['email', 'password'],
      role: 'admin'
    }
  });
});

// Protected admin routes (require admin authentication)
router.get('/#', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin Dashboard',
    data: {
      dashboard: 'Shopzeo Admin Dashboard',
      status: 'active',
      timestamp: new Date().toISOString(),
      admin: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        is_verified: req.user.is_verified
      }
    }
  });
});

router.get('/profile', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin Profile',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        is_verified: req.user.is_verified
      }
    }
  });
});

router.get('/stats', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin Statistics',
    data: {
      stats: {
        total_orders: 190,
        total_stores: 10,
        total_products: 402,
        total_customers: 7,
        pending_orders: 58,
        confirmed_orders: 21,
        delivered_orders: 77,
        earnings: {
          in_house: 39892.00,
          commission: 12755.02,
          delivery_charge: 1360.00
        }
      }
    }
  });
});

// Catch-all route for admin panel
router.get('*', (req, res) => {
  res.json({
    success: false,
    message: 'Admin route not found',
    data: {
      available_routes: [
        'GET /admin/login - Admin login info',
        'GET /admin/dashboard - Dashboard (Auth required)',
        'GET /admin/profile - Profile (Auth required)',
        'GET /admin/stats - Statistics (Auth required)'
      ]
    }
  });
});

module.exports = router;
