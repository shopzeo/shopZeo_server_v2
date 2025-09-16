const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController'); // We will use the controller
const { authenticateToken } = require('../middleware/userAuth.js'); // Your authentication middleware

// Protect all payment routes - only authenticated users can access them.
router.use(authenticateToken);


router.get('/get-key', paymentController.getRazorpayKey);


router.post('/create-order/:orderId', paymentController.createRazorpayOrder);

router.post('/verify-payment', paymentController.verifyRazorpayPayment);


module.exports = router;