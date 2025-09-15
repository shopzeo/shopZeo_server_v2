const express = require('express');
const router = express.Router();
const { Payment, Order } = require('../models');
const { authenticateToken } = require('../middleware/userAuth.js'); // <-- सही पाथ
const PaymentService = require('../services/paymentService');

// --- आपके मौजूदा रूट्स (बिना किसी बदलाव के) ---

router.get('/', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.findAll({ where: { userId: req.user.id }, include: [Order], order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, userId: req.user.id }, include: [Order] });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentDetails } = req.body;
    const order = await Order.findOne({ where: { id: orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'Order cannot be paid' });
    
    const payment = await Payment.create({ userId: req.user.id, orderId: order.id, amount: order.total, paymentMethod, paymentDetails, status: 'processing' });
    await order.update({ status: 'paid' });
    
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Razorpay इंटीग्रेशन के लिए नए रूट्स (अब सर्विस का उपयोग कर रहे हैं) ---

// 1. Razorpay Key भेजने के लिए
router.get('/razorpay/get-key', authenticateToken, (req, res) => {
    try {
        const key = PaymentService.getRazorpayKey();
        res.status(200).json(key);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not get Razorpay key.' });
    }
});

// 2. Razorpay ऑर्डर बनाने के लिए
router.post('/razorpay/create-order', authenticateToken, async (req, res) => {
    try {
        const { totalAmount } = req.body;
        const razorpayOrder = await PaymentService.createRazorpayOrder(totalAmount);
        res.status(200).json({ success: true, razorpayOrder });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
});

// 3. पेमेंट को वेरिफाई करने और डेटाबेस में ऑर्डर बनाने के लिए
router.post('/razorpay/verify-payment', authenticateToken, async (req, res) => {
    try {
        const result = await PaymentService.verifyAndCreateOrder(req.body, req.user);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
});

module.exports = router;