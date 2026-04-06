const Payment = require('../models/Payment');
const stripe = require('../config/stripe');
const { sendPaymentEvent } = require('../config/kafka');

/**
 * Create a new payment and initiate Stripe payment intent
 */
exports.createPayment = async (paymentData) => {
    if (!paymentData.amount || !paymentData.slot_id || !paymentData.patient_id) {
        throw new Error('All fields are required');
    }

    const payment = await Payment.create(paymentData);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
            payment_id: payment.id,
            slot_id: payment.slot_id,
            patient_id: payment.patient_id,
        },
    });

    return {
        payment,
        clientSecret: paymentIntent.client_secret,
    };
};

/**
 * Get all payments
 */
exports.getPayments = async () => {
    return await Payment.findAll();
};

/**
 * Get payments by user id
 */
exports.getPaymentsByUserId = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const payments = await Payment.findByPatientId(userId);

    if (!payments) {
        throw new Error('No payments found for this user');
    }

    return payments;
};

/**
 * Get payment by payment id
 */
exports.getPaymentById = async (paymentId) => {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
        throw new Error('Payment not found');
    }

    return payment;
};

/**
 * Get payment by appointment id
 */
exports.getPaymentByAppointmentId = async (appointmentId) => {
    if (!appointmentId) {
        throw new Error('Appointment ID is required');
    }
    
    const payment = await Payment.findByAppointmentId(appointmentId);

    if (!payment) {
        throw new Error('Payment not found');
    }

    return payment;
};

/**
 * Get payments by status
 */
exports.getPaymentsByStatus = async (status) => {
    if (!status) {
        throw new Error('Status is required');
    }

    const payments = await Payment.findByStatus(status);

    return payments;
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (paymentId, status, transactionId) => {
    const updatedPayment = await Payment.updateStatus(paymentId, status, transactionId);

    if (!updatedPayment) {
        throw new Error('Payment not found');
    }

    // Emit Kafka event so that notification-service can notify the patient
    if (status === 'SUCCESS') {
        await sendPaymentEvent('PAYMENT_COMPLETED', {
            paymentId: updatedPayment.id,
            userId: updatedPayment.patient_id,
            amount: updatedPayment.amount,
            transactionId,
        });
    } else if (status === 'FAILED') {
        await sendPaymentEvent('PAYMENT_FAILED', {
            paymentId: updatedPayment.id,
            userId: updatedPayment.patient_id,
            amount: updatedPayment.amount,
            reason: 'Payment was declined',
            transactionId,
        });
    }

    return updatedPayment;
};

/**
 * Delete payment
 */
exports.deletePayment = async (paymentId, user) => {
    const deletePayment = await Payment.findById(paymentId);

    if (!deletePayment) {
        throw new Error('Payment not found');
    }

    if ((user.role === 'patient' && deletePayment.patient_id !== user.userId)) {
        throw new Error('Unauthorized');
    }

    const deletedPayment = await Payment.delete(paymentId);

    return deletedPayment;
};
