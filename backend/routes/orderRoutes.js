const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// Public routes
router.get('/products', orderController.getProducts);

// Protected routes (require authentication)
router.post('/create-payment-order', verifyToken, orderController.createPaymentOrder);
router.post('/verify-and-purchase', verifyToken, orderController.verifyAndPurchase);
router.post('/record-cancelled', verifyToken, orderController.recordCancelledPayment);
router.post('/record-failed', verifyToken, orderController.recordFailedPayment);
router.post('/purchase', verifyToken, orderController.purchaseProduct);
router.get('/my-orders', verifyToken, orderController.getMyOrders);
router.get('/:id', verifyToken, orderController.getOrderDetails);

module.exports = router;