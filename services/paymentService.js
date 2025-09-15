const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../models'); // Sequelize models
const { AppError } = require('../middleware/errorHandler'); // Correct path to error handler

// Razorpay Instance को इनिशियलाइज़ करें
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
    /**
     * Creates a Razorpay order.
     * @param {number} totalAmount - The total amount in INR.
     */
    async createRazorpayOrder(totalAmount) {
        try {
            const options = {
                amount: Math.round(totalAmount * 100), // राशि पैसे में
                currency: "INR",
                receipt: `receipt_order_${uuidv4()}`,
            };
            const razorpayOrder = await razorpay.orders.create(options);
            return razorpayOrder;
        } catch (error) {
            console.error('Razorpay Order Creation Service Error:', error);
            throw new AppError('Failed to create Razorpay order.', 500);
        }
    }

    /**
     * Verifies the Razorpay payment and creates the order in the database.
     * @param {object} verificationData - Data from the frontend.
     * @param {object} user - The authenticated user.
     */
    async verifyAndCreateOrder(verificationData, user) {
        const t = await db.sequelize.transaction();
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                cartItems,
                shippingAddress,
                billingAddress,
                totalAmount
            } = verificationData;

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                throw new AppError("Payment verification failed. Signature mismatch.", 400);
            }

            // पेमेंट सफल है, अब डेटाबेस में ऑर्डर बनाएँ
            const store_id = cartItems[0].store.id;

            const order = await db.Order.create({
                id: uuidv4(),
                customerId: user.id,
                storeId: store_id,
                shippingAddress: JSON.stringify(shippingAddress),
                billingAddress: JSON.stringify(billingAddress),
                totalAmount: totalAmount,
                paymentMethod: 'razorpay',
                paymentStatus: 'paid',
                transactionId: razorpay_payment_id,
                status: 'confirmed',
            }, { transaction: t });

            for (const item of cartItems) {
                await db.OrderItem.create({
                    orderId: order.id,
                    productId: item.id,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    totalPrice: item.price * item.quantity,
                    productName: item.name,
                    storeId: store_id
                }, { transaction: t });
            }

            await t.commit();
            return { success: true, message: "Order placed successfully!", orderId: order.id };

        } catch (error) {
            await t.rollback();
            if (error instanceof AppError) throw error;
            throw new AppError("Failed to verify payment and create order.", 500);
        }
    }

    /**
     * Returns the Razorpay Key ID.
     */
    getRazorpayKey() {
        return { key: process.env.RAZORPAY_KEY_ID };
    }
}

module.exports = new PaymentService();