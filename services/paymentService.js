const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order, Payment } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay order for a given internal order ID.
 * @param {string} orderId - The UUID of the order in your database.
 * @param {object} user - The authenticated user object.
 * @returns {object} The details of the created Razorpay order.
 */
exports.createRazorpayOrder = async (orderId, user) => {
    // 1. Find the order in your database
    const order = await Order.findOne({ where: { id: orderId, userId: user.id } });
    if (!order) {
        throw new AppError('Order not found or does not belong to user.', 404);
    }
    if (order.paymentStatus === 'paid') {
        throw new AppError('This order has already been paid for.', 400);
    }

    // 2. Prepare Razorpay order options
    const options = {
        amount: order.totalAmount * 100, // Amount in the smallest currency unit (paise)
        currency: 'INR',
        receipt: order.id, // Use your internal order ID as the receipt
    };

    // 3. Create the order with Razorpay
    const razorpayOrder = await razorpay.orders.create(options);

    // 4. Optionally, save the razorpay_order_id to your order table for reference
    await order.update({ transactionId: razorpayOrder.id });

    return {
        id: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
        name: 'ShopZeo', // Your App/Company Name
        description: `Payment for Order #${order.id}`,
        orderId: order.id, // Your internal order ID
        prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone,
        },
    };
};

/**
 * Verifies the Razorpay payment signature.
 * @param {object} body - The request body containing payment details from frontend.
 * @returns {object} A confirmation object.
 */
exports.verifyRazorpayPayment = async (body) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;

    // 1. Generate the expected signature
    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    // 2. Compare the signatures
    if (generated_signature !== razorpay_signature) {
        throw new AppError('Payment verification failed: Invalid signature.', 400);
    }

    // 3. Signature is valid. Update your database.
    const order = await Order.findByPk(order_id);
    if (!order) {
        throw new AppError('Order not found.', 404);
    }

    // Update order and create a payment record
    await order.update({ paymentStatus: 'paid', status: 'confirmed' });
    await Payment.create({
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: 'razorpay',
        transactionId: razorpay_payment_id,
        status: 'completed',
    });

    return { status: 'success', orderId: order.id, paymentId: razorpay_payment_id };
};