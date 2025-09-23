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
//get listing of order
router.get('/order-list', orderController.getOrderList);

//get listing of order
router.put('/:id', orderController.updateOrder);


// GET /api/orders/:id - Get a single order by ID
router.get('/:id', orderController.getOrderById);

// PATCH /api/orders/:orderId/cancel - Cancel an order
router.patch('/:orderId/cancel', orderController.cancelOrder);

// Get all orders for a store
// routes/orders.js
router.get("/store/orders", orderController.getOrdersBySeller);

router.patch("/:id/confirm", orderController.confirmOrder);
// routes/orderRoutes.js
router.get("/:id/invoice", orderController.generateInvoice);

router.get("/:id/label", orderController.generateLabel);
module.exports = router;