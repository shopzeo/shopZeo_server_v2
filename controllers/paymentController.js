const PaymentService = require('../services/paymentService');
const { AppError } = require('../middleware/errorHandler');
const db = require('../models');

const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

exports.createRazorpayOrder = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    if (!orderId) {
      return next(new AppError('Order ID is required to create a Razorpay order', 400));
    }
    const razorpayOrderDetails = await PaymentService.createRazorpayOrder(orderId, req.user);
    res.status(200).json(razorpayOrderDetails);
});

// Naya function joda gaya hai
exports.createRazorpayOrderForMultipleOrders = catchAsync(async (req, res, next) => {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return next(new AppError('An array of order IDs is required.', 400));
    }

    const orders = await db.Order.findAll({
        where: {
            id: orderIds,
            customerId: req.user.id,
        },
    });

    if (orders.length !== orderIds.length) {
        return next(new AppError('One or more orders not found or do not belong to the user.', 404));
    }

    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    const razorpayOrderDetails = await PaymentService.createRazorpayOrderForMultiple(orderIds, totalAmount, req.user);

    res.status(200).json(razorpayOrderDetails);
});


exports.verifyRazorpayPayment = catchAsync(async (req, res, next) => {
    const result = await PaymentService.verifyRazorpayPayment(req.body);
    res.status(200).json(result);
});

exports.getRazorpayKey = (req, res) => {
    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKey) {
        return res.status(500).json({
            success: false,
            message: 'Razorpay key is not configured on the server'
        });
    }
    res.status(200).json({ key: razorpayKey });
};