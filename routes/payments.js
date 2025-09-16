const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/userAuth.js');
const {
  createRazorpayOrderValidator,
  verifyRazorpayPaymentValidator,
} = require('../validators/paymentValidator'); // <-- import validators
const { validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Protect all payment routes
router.use(authenticateToken);

// Get Razorpay Key
router.get('/get-key', paymentController.getRazorpayKey);

// Create Razorpay Order (with validation)
router.post(
  '/create-order/:orderId',
  createRazorpayOrderValidator,
  handleValidationErrors,
  paymentController.createRazorpayOrder
);

// Verify Razorpay Payment (with validation)
router.post(
  '/verify-payment',
  verifyRazorpayPaymentValidator,
  handleValidationErrors,
  paymentController.verifyRazorpayPayment
);

module.exports = router;
