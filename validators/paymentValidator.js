const { body } = require('express-validator');

// Validation for creating a Razorpay order
const createRazorpayOrderValidator = [
  // isUUID function check karta hai ki orderId sahi UUID format mein hai ya nahi.
  body('orderId').isUUID().withMessage('Invalid Order ID format.')
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