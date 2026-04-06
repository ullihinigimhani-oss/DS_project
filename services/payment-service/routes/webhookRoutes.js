const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Stripe webhook endpoints - no auth required for webhooks
router.post('/stripe', paymentController.handleWebhook);
router.post('/payhere', paymentController.handleWebhook);

module.exports = router;
