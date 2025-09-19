const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/userAuth.js');
const {
  createRazorpayOrderValidator,
  verifyRazorpayPaymentValidator,
} = require('../validators/paymentValidator');
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.use(authenticateToken);

router.get('/get-key', paymentController.getRazorpayKey);

router.post(
  '/api/payments/create-order/:orderId',
  createRazorpayOrderValidator,
  handleValidationErrors,
  paymentController.createRazorpayOrder
);

// Naya endpoint joda gaya hai
router.post(
  '/razorpay/create-order-for-multiple',
  paymentController.createRazorpayOrderForMultipleOrders
);

router.post(
  '/verify-payment',
  verifyRazorpayPaymentValidator,
  handleValidationErrors,
  paymentController.verifyRazorpayPayment
);

module.exports = router;