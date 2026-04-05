const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { createPayment, getPayments, getUserPayments, getPayment,
    getAppointmentPayment, handleStripeWebhook, getPaymentsByStatus, deletePayment,
    getAdminStats, confirmPayment, getDoctorRevenue } = require('../controllers/paymentController');

// Payment Controller

// Admin stats
router.get('/admin/stats', authMiddleware, getAdminStats);

// Doctor revenue (slot-based, filtered by period)
router.get('/doctor/revenue', authMiddleware, getDoctorRevenue);

// Post requests
router.post('/insertPayment', authMiddleware, createPayment);
router.patch('/payments/:id/confirm', authMiddleware, confirmPayment);

// Get requests
router.get('/getPayments', authMiddleware, getPayments);
router.get('/getUserPayments', authMiddleware, getUserPayments);
router.get('/getPayment/:id', authMiddleware, getPayment);
router.get('/getAppointmentPayment', getAppointmentPayment);
router.get('/filterByStatus', authMiddleware, getPaymentsByStatus);

// Delete requests
router.delete('/deletePayment/:id', authMiddleware, deletePayment);

// Webhook Controllers — Stripe sends raw POST with no JWT, must NOT use authMiddleware
router.post('/webhook', handleStripeWebhook);

module.exports = router;
