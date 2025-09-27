const express = require("express");
const router = express.Router();
const dashBoardController = require("../controllers/dashBoardController.js");
const { authenticateToken } = require("../middleware/userAuth.js");
router.use(authenticateToken);
router.get("/vendor-wallet", dashBoardController.vendorWallet);
router.get("/delivered-orders", dashBoardController.deliveredOrders);
router.get("/pending-orders", dashBoardController.pendingOrders);
module.exports = router;
