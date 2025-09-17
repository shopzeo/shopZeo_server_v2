const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/userAuth.js');

// All routes in this file require authentication
router.use(authenticateToken);

// POST /api/orders - Create a new order
router.post('/', orderController.createOrder);

// GET /api/orders - Get the current user's orders
router.get('/', orderController.getMyOrders);

// GET /api/orders/:id - Get a single order by ID
router.get('/:id', orderController.getOrderById);

// PATCH /api/orders/:orderId/cancel - Cancel an order
router.patch('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;