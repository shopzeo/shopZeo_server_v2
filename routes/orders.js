const express = require("express");
const router = express.Router();
const OrderService = require("../services/orderService");
const { Order, OrderItem, Product } = require("../models/associations");
const { authenticateToken } = require("../middleware/userAuth.js");

// Protect all routes in this file
router.use(authenticateToken);

// Create new order(s)
router.post("/", async (req, res) => {
  try {
    const createdOrders = await OrderService.createOrder(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: `${createdOrders.length} order(s) have been successfully placed.`,
      data: createdOrders,
    });
  } catch (error) {
    console.error(" Order Creation Failed!", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An internal server error occurred.",
    });
  }
});

// Get all orders for the logged-in user
router.get("/", async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.user.id }, // Using camelCase to match model
      include: [
        {
          model: OrderItem,
          as: "items", // Make sure this alias is defined in your Order model association
          include: [Product],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Fetching Orders Failed!", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      status,
      req.user.id,
      notes
    );
    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}".`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Order Status Update Failed!", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An internal server error occurred.",
    });
  }
});
module.exports = router;
