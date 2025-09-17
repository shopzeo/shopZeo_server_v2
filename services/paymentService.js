const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order, Payment } = require('../models');
const { AppError } = require('../middleware/errorHandler');

class PaymentService {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('❌ Razorpay API keys are not set in the environment variables.');
      throw new Error('Razorpay API keys are not configured.');
    }

    this.instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Creates a Razorpay order for an existing database order.
   * @param {string} orderId - The ID of the database order.
   * @param {object} user - The authenticated user object.
   * @returns {object} - The Razorpay order details.
   */
  async createRazorpayOrder(orderId, user) {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.customerId.toString() !== user.id.toString()) {
      throw new AppError('Access denied. You do not own this order.', 403);
    }
    if (order.paymentStatus !== 'pending') {
      throw new AppError('Order has already been paid or is not in a pending state', 400);
    }
    
    // Validate order amount
    if (!order.totalAmount || order.totalAmount <= 0) {
        throw new AppError('Order amount must be a positive number.', 400);
    }

    try {
      const razorpayOrder = await this.instance.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: order.currency,
        receipt: order.orderNumber,
        notes: {
          databaseOrderId: order.id,
          orderNumber: order.orderNumber,
        },
      });

      console.log('✅ Razorpay order created successfully:', razorpayOrder.id);

      await order.update({
        paymentGateway: 'razorpay',
        gatewayTransactionId: razorpayOrder.id,
      });

      return {
        success: true,
        message: 'Razorpay order created successfully',
        data: {
          razorpayOrderId: razorpayOrder.id,
          currency: razorpayOrder.currency,
          amount: razorpayOrder.amount,
          orderId: order.id,
          userEmail: user.email,
        },
      };
    } catch (error) {
      // Better error handling for Razorpay API response
      if (error.error && error.error.description) {
        console.error('❌ Razorpay API Error Response:', error.error.description);
        throw new AppError(error.error.description, error.statusCode || 400);
      }
      
      console.error('❌ Razorpay order creation failed:', error.message);
      throw new AppError('Failed to create Razorpay order', 500);
    }
  }

  async verifyRazorpayPayment(paymentData) {
    console.log('--- Payment Verification Started ---');
    console.log('Received payment data from client:', paymentData);
    
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = paymentData;

    try {
      if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError('Missing required payment verification fields.', 400);
      }

      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new AppError('Order not found in database', 404);
      }
      if (order.paymentStatus === 'paid') {
        return { success: true, message: 'Payment already verified.' };
      }

      const signaturePayload = razorpay_order_id + '|' + razorpay_payment_id;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(signaturePayload);
      const generatedSignature = hmac.digest('hex');

      console.log('Server generated signature:', generatedSignature);
      console.log('Client received signature:', razorpay_signature);
      
      if (generatedSignature !== razorpay_signature) {
        throw new AppError('Payment verification failed. Signature mismatch.', 400);
      }
      
      console.log('✅ Razorpay payment signature verified successfully.');

      const transaction = await Order.sequelize.transaction();
      try {
        await order.update(
          {
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'razorpay',
            gatewayTransactionId: razorpay_payment_id,
          },
          { transaction }
        );

        await Payment.create(
          {
            orderId: order.id,
            paymentNumber: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            amount: order.totalAmount,
            currency: order.currency,
            method: 'razorpay',
            status: 'completed',
            gatewayTransactionId: razorpay_payment_id,
          },
          { transaction }
        );
        
        await transaction.commit();

        console.log('✅ Order and payment records updated successfully in the database.');

        return {
          success: true,
          message: 'Payment verified successfully and order is confirmed',
          data: {
            orderId: order.id,
            paymentId: razorpay_payment_id,
          },
        };
      } catch (dbError) {
        await transaction.rollback();
        console.error('❌ Database update failed after successful verification:', dbError);
        throw new AppError('Failed to update order and payment records', 500);
      }
    } catch (error) {
      console.error('❌ Payment verification failed:', error.message);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }
}

module.exports = new PaymentService();