const { body, param } = require('express-validator'); // param ko import karein

// Validation for creating a Razorpay order
const createRazorpayOrderValidator = [
  // ab 'param' ka istemal karein taki orderId URL se aaye
  param('orderId').isUUID().withMessage('Invalid Order ID format.')
];

// Validation for verifying a Razorpay payment
const verifyRazorpayPaymentValidator = [
  // In fields ki zaroorat hoti hai Razorpay se payment verify karne ke liye.
  body('orderId').isUUID().withMessage('Invalid Order ID format.'),
  body('razorpay_order_id').notEmpty().withMessage('Razorpay Order ID is required.'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay Payment ID is required.'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay Signature is required.')
];

module.exports = {
  createRazorpayOrderValidator,
  verifyRazorpayPaymentValidator,
};