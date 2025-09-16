const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const { authenticateToken } = require('../middleware/userAuth.js');


router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    
    const createdOrders = await OrderService.createOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `${createdOrders.length} order(s) have been successfully placed.`,
      data: createdOrders,
    });
  } catch (error) {
    console.error("Order Creation Failed!", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'An internal server error occurred.',
    });
  }
});


router.get('/', async (req, res) => {
  try {
    const orders = await OrderService.getMyOrders(req.user);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Fetching Orders Failed!", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'An internal server error occurred.',
    });
  }
});


router.get('/:id', async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await OrderService.getOrderById(orderId, req.user);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      console.error(`Fetching Order ${req.params.id} Failed!`, error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'An internal server error occurred.',
      });
    }
});


router.patch('/:id/cancel', async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await OrderService.cancelOrder(orderId, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to cancel the order.',
    });
  }
});

module.exports = router;