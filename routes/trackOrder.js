const express = require('express');
const router = express.Router();
const trackOrderController = require('../controllers/trackOrderController');
const { authenticateToken } = require('../middleware/userAuth');

// Protect all routes in this file
router.use(authenticateToken);

// Track order by orderId
router.get('/:orderId', trackOrderController.trackOrder);

module.exports = router;