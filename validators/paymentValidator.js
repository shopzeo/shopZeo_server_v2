const { param, body } = require('express-validator');

// Validation rules for creating a Razorpay order
exports.createRazorpayOrderValidator = [
    param('orderId')
        .notEmpty().withMessage('Order ID is required.')
        .isUUID().withMessage('Invalid Order ID format.'),
];

// Validation rules for verifying a payment
exports.verifyRazorpayPaymentValidator = [
    body('razorpay_order_id')
        .notEmpty().withMessage('Razorpay Order ID is required.'),
    body('razorpay_payment_id')
        .notEmpty().withMessage('Razorpay Payment ID is required.'),
    body('razorpay_signature')
        .notEmpty().withMessage('Razorpay Signature is required.'),
    // It's crucial to get your internal order ID to prevent mix-ups
    body('order_id')
        .notEmpty().withMessage('Your internal Order ID is required.')
        .isUUID().withMessage('Invalid Order ID format.'),
];