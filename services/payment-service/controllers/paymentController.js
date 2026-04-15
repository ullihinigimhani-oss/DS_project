const stripeService = require('../services/stripeService');
const stripe = require('../config/stripe');

function getRequesterUserId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?.sub ||
        req.body?.patient_id ||
        req.body?.userId ||
        null
    );
}

/**
 * Create a new payment and initiate Stripe payment intent
 */
exports.createPayment = async (req, res) => {
    try {
        const patient_id = getRequesterUserId(req);
        const { amount, slot_id } = req.body;

        if (!patient_id) {
            return res.status(401).json({
                success: false,
                error: 'Unable to resolve authenticated user id',
            });
        }

        if (!amount || !slot_id) {
            return res.status(400).json({
                success: false,
                error: 'Amount and slot_id are required'
            });
        }

        const paymentData = { amount, slot_id, patient_id };
        const result = await stripeService.createPayment(paymentData);

        res.status(201).json({
            success: true,
            message: 'Payment initiated',
            data: result
        });
    } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Payment creation failed"
        });
    }
};

/**
 * Get all payments
 */
exports.getPayments = async (req, res) => {
    try {
        const payments = await stripeService.getPayments();

        res.status(200).json({
            success: true,
            message: 'Get all payments',
            data: payments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get payments by user id
 */
exports.getUserPayments = async (req, res) => {
    try {
        const patient_id = getRequesterUserId(req);
        if (!patient_id) {
            return res.status(401).json({
                success: false,
                error: 'Unable to resolve authenticated user id',
            });
        }
        const payments = await stripeService.getPaymentsByUserId(patient_id);

        res.status(200).json({
            success: true,
            message: 'Get user payments',
            data: payments
        });
    } catch (error) {
        if (error.message === 'User ID is required') {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else if (error.message === 'No payments found for this user') {
            res.status(404).json({
                success: false,
                error: error.message
            });
    } else {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionId } = req.body;

        const payment = await stripeService.getPaymentById(id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        const requesterId = getRequesterUserId(req);
        if (!requesterId) {
            return res.status(401).json({
                success: false,
                error: 'Unable to resolve authenticated user id'
            });
        }

        if (String(payment.patient_id) !== String(requesterId)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden'
            });
        }

        const updated = await stripeService.updatePaymentStatus(id, 'SUCCESS', transactionId);

        res.status(200).json({
            success: true,
            message: 'Payment confirmed',
            data: updated
        });
    } catch (error) {
        if (error.message === 'Payment not found') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete payment
 */
exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const deletedPayment = await stripeService.deletePayment(id, user);

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully',
            data: deletedPayment
        });
    } catch (error) {
        if (error.message === 'Payment not found') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        } else if (error.message === 'Unauthorized') {
            return res.status(403).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

/**
 * Get payment by id
 */
exports.getPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await stripeService.getPaymentById(id);

        res.status(200).json({
            success: true,
            message: 'Get payment by id',
            data: payment
        });
    } catch (error) {
        if (error.message === 'Payment not found') {
            res.status(404).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

/**
 * Get payment by appointment id
 */
exports.getAppointmentPayment = async (req, res) => {
    try {
        const { appointment_id } = req.query;
        const payment = await stripeService.getPaymentByAppointmentId(appointment_id);

        res.status(200).json({
            success: true,
            message: 'Get payment by appointment id',
            data: payment
        });
    } catch (error) {
        if (error.message === 'Appointment ID is required') {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else if (error.message === 'Payment not found') {
            res.status(404).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

/**
 * Get payments by status
 */
exports.getPaymentsByStatus = async (req, res) => {
    try {
        const { status } = req.query;
        const payments = await stripeService.getPaymentsByStatus(status);

        res.status(200).json({
            success: true,
            message: 'Get payments by status',
            data: payments
        });
    } catch (error) {
        if (error.message === 'Status is required') {
            res.status(400).json({
                success: false,
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

/**
 * Stripe webhook handler
 */
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const paymentId = paymentIntent.metadata.payment_id;
            const transactionId = paymentIntent.id;
            await stripeService.updatePaymentStatus(paymentId, 'SUCCESS', transactionId);
        }
        else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const paymentId = paymentIntent.metadata.payment_id;
            const transactionId = paymentIntent.id;
            await stripeService.updatePaymentStatus(paymentId, 'FAILED', transactionId);
        }
        else if (event.type === 'charge.refunded') {
            const charge = event.data.object;
            const paymentId = charge.metadata.payment_id;
            const transactionId = charge.id;
            await stripeService.updatePaymentStatus(paymentId, 'REFUNDED', transactionId);
        }
        else {
            console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (error) {
        if (error.message === 'Payment not found') {
            console.error('Payment not found for webhook event:', error);
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }
        console.error('Error processing webhook event:', error);
        res.status(500).json({ success: false, error: 'Webhook processing error' });
    }
}

/**
 * Admin overview stats
 */
exports.getAdminStats = async (req, res) => {
    try {
        const db = require('../config/postgres');
        const now = new Date();
        const reqYear = parseInt(req.query.year);
        const reqMonth = parseInt(req.query.month);
        const hasFilter = !isNaN(reqYear) && !isNaN(reqMonth) && reqMonth >= 1 && reqMonth <= 12;

        let result;
        if (hasFilter) {
            const dateFrom = new Date(reqYear, reqMonth - 1, 1).toISOString();
            const dateTo = new Date(reqYear, reqMonth, 0, 23, 59, 59, 999).toISOString();
            result = await db.query(`
                SELECT
                    COUNT(*)                                                        AS total,
                    COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_revenue,
                    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)                 AS completed,
                    COUNT(CASE WHEN status = 'PENDING'  THEN 1 END)                AS pending,
                    COUNT(*)                                                        AS this_month
                FROM payments
                WHERE created_at >= $1 AND created_at <= $2
            `, [dateFrom, dateTo]);
        } else {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            result = await db.query(`
                SELECT
                    COUNT(*)                                                        AS total,
                    COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_revenue,
                    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)                 AS completed,
                    COUNT(CASE WHEN status = 'PENDING'  THEN 1 END)                AS pending,
                    COUNT(CASE WHEN created_at >= $1    THEN 1 END)                AS this_month
                FROM payments
            `, [firstOfMonth]);
        }

        const row = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
                total: parseInt(row.total),
                totalRevenue: parseFloat(row.total_revenue),
                completed: parseInt(row.completed),
                pending: parseInt(row.pending),
                thisMonth: parseInt(row.this_month),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Doctor revenue — grouped by day / week / month
 */
exports.getDoctorRevenue = async (req, res) => {
    try {
        const { slotIds, period = 'monthly' } = req.query;

        const validPeriods = ['daily', 'weekly', 'monthly'];
        if (!validPeriods.includes(period)) {
            return res.status(400).json({ success: false, error: 'Invalid period. Use daily, weekly, or monthly.' });
        }

        const ids = slotIds ? slotIds.split(',').map(s => s.trim()).filter(Boolean) : [];
        const Payment = require('../models/Payment');
        const rows = await Payment.getDoctorRevenue(ids, period);

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Confirm payment after successful Stripe client-side confirmation
 */
exports.confirmPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionId } = req.body;

        const payment = await stripeService.getPaymentById(id);

        // Only patient who created payment may confirm it
        const requesterId = getRequesterUserId(req);
        if (requesterId && String(payment.patient_id) !== String(requesterId)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        if (payment.status === 'SUCCESS') {
            return res.status(200).json({ success: true, message: 'Already confirmed', data: payment });
        }

        const updated = await stripeService.updatePaymentStatus(id, 'SUCCESS', transactionId || null);
        res.status(200).json({ success: true, message: 'Payment confirmed', data: updated });
    } catch (error) {
        if (error.message === 'Payment not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};
