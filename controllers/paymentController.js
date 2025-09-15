const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order, OrderItem, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Razorpay Instance को इनिशियलाइज़ करें
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Razorpay ऑर्डर बनाने के लिए
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { totalAmount } = req.body;
        const options = {
            amount: Math.round(totalAmount * 100), // राशि पैसे में
            currency: "INR",
            receipt: `receipt_order_${uuidv4()}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.status(200).json({ success: true, razorpayOrder });

    } catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }
};

// 2. पेमेंट को वेरिफाई करने और डेटाबेस में ऑर्डर बनाने के लिए
exports.verifyPaymentAndCreateOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            cartItems,
            shippingAddress,
            totalAmount
        } = req.body;

        const customerId = req.user.id;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        // पेमेंट सफल है, अब डेटाबेस में ऑर्डर बनाएँ
        const store_id = cartItems[0].store_id;

        const order = await Order.create({
            id: uuidv4(),
            customer_id: customerId,
            store_id,
            shipping_address: JSON.stringify(shippingAddress),
            total_amount: totalAmount,
            payment_method: 'razorpay',
            payment_status: 'paid',
            transaction_id: razorpay_payment_id,
            status: 'confirmed',
        }, { transaction: t });

        for (const item of cartItems) {
            await OrderItem.create({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                price: item.price,
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, message: "Order placed successfully!", orderId: order.id });

    } catch (error) {
        await t.rollback();
        console.error('Verify Payment Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// 3. Razorpay Key भेजने के लिए
exports.getRazorpayKey = (req, res) => {
    res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
};