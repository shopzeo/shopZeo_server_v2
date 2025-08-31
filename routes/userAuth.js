const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/userAuthController');
const { authenticateToken, rateLimit } = require('../middleware/userAuth');

// Debug middleware to log all requests
const debugMiddleware = (req, res, next) => {
  console.log(`🔍 [DEBUG] ${req.method} ${req.path} - Middleware: ${req.route ? 'Route found' : 'No route'}`);
  console.log(`🔍 [DEBUG] Headers:`, req.headers);
  next();
};

// Apply debug middleware to all routes
router.use(debugMiddleware);

// Apply rate limiting to all auth routes
router.use(rateLimit(50, 15 * 60 * 1000)); // 50 requests per 15 minutes

// Public routes (no authentication required)
router.post('/signup', userAuthController.signupValidation, userAuthController.signup);
router.post('/login', userAuthController.loginValidation, userAuthController.login);
router.post('/verify-otp', userAuthController.otpValidation, userAuthController.verifyOTP);
router.post('/forgot-password', userAuthController.forgotPassword);
router.post('/reset-password', userAuthController.resetPassword);

// Protected routes (authentication required)
router.use(authenticateToken); // Apply middleware to all routes below

router.get('/profile', userAuthController.getProfile);
router.put('/profile', userAuthController.updateProfile);
router.post('/change-password', userAuthController.changePassword);
router.post('/logout', userAuthController.logout);
router.post('/refresh-token', userAuthController.refreshToken);

module.exports = router;
