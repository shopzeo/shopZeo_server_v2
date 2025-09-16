const db = require('../models');
const { AppError } = require('../middleware/errorHandler');
const Razorpay = require('razorpay');
const crypto = require('crypto');

class PaymentService {

    /**
     * Creates a Razorpay order to initiate a payment transaction.
     * This is called by the frontend to get an order_id for the checkout popup.
     */
    async createRazorpayOrder(orderId, user) {
        try {
            const order = await db.Order.findOne({ where: { id: orderId, customerId: user.id } });
            if (!order) throw new AppError("Order not found.", 404);
            if (order.paymentStatus === 'paid') throw new AppError("This order has already been paid.", 400);

            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const options = {
                amount: Math.round(order.totalAmount * 100), // Amount in the smallest currency unit (paise)
                currency: "INR",
                receipt: order.id, // Your internal database order ID
            };

            const razorpayOrder = await instance.orders.create(options);
            if (!razorpayOrder) throw new AppError("Could not create Razorpay order.", 500);

            // Return the necessary details for the frontend to open the checkout
            return {
                success: true,
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID // The public key for the frontend
            };
        } catch (error) {
            console.error("Create Razorpay Order Service Error:", error);
            if (error instanceof AppError) throw error;
            throw new AppError("Failed to initiate payment.", 500);
        }
    }

    /**
     * Verifies the payment signature from Razorpay to confirm payment success.
     * This is a crucial security step.
     */
    async verifyRazorpayPayment(paymentData) {
        const t = await db.sequelize.transaction();
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = paymentData;
            
            // The body for HMAC should be order_id + "|" + razorpay_payment_id
            const body = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");
            
            if (expectedSignature === razorpay_signature) {
                // Signature is valid, now update the order in your database
                const order = await db.Order.findByPk(dbOrderId, { transaction: t });
                if (!order) throw new AppError("Order not found in our database.", 404);
                
                await order.update({
                    paymentStatus: 'paid',
                    status: 'confirmed', // Update status to confirmed
                    transactionId: razorpay_payment_id,
                    paymentGateway: 'Razorpay'
                }, { transaction: t });
                
                await t.commit();
                return { success: true, message: "Payment successful and verified." };
            } else {
                throw new AppError("Payment verification failed. Signature mismatch.", 400);
            }
        } catch (error) {
            await t.rollback();
            console.error("Verify Razorpay Payment Service Error:", error);
            if (error instanceof AppError) throw error;
            throw new AppError("Failed to verify payment.", 500);
        }
    }
}

module.exports = new PaymentService();