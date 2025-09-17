const PaymentService = require('../services/paymentService');
const { AppError } = require('../middleware/errorHandler');

// A simple helper function to catch errors in async functions
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * STEP 1: Create a pending order in the database first.
 * This is now handled by your robust OrderController.
 * The frontend should call the POST /api/orders endpoint first.
 */

/**
 * STEP 2: Initiate the payment for an EXISTING order.
 * This function creates a Razorpay order linked to your database order.
 */
exports.createRazorpayOrder = catchAsync(async (req, res, next) => {
    const { orderId } = req.params; // The ID of the order already created in your DB
    
    if (!orderId) {
      return next(new AppError('Order ID is required to create a Razorpay order', 400));
    }

    // Call the service function to handle the business logic
    const razorpayOrderDetails = await PaymentService.createRazorpayOrder(orderId, req.user);
    
    res.status(200).json(razorpayOrderDetails);
});

/**
 * STEP 3: Verify the payment and update the order status.
 * This is the final, secure step.
 */
exports.verifyRazorpayPayment = catchAsync(async (req, res, next) => {
    // The frontend must send the original database order ID along with payment details
    const result = await PaymentService.verifyRazorpayPayment(req.body);
    
    res.status(200).json(result);
});

/**
 * (Optional but Recommended)
 * Endpoint for the frontend to get the public Razorpay Key ID.
 */
exports.getRazorpayKey = (req, res) => {
    // Make sure to fetch the key from the environment variables securely
    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    
    if (!razorpayKey) {
        return res.status(500).json({
            success: false,
            message: 'Razorpay key is not configured on the server'
        });
    }

    res.status(200).json({ key: razorpayKey });
};