const { query } = require('../config/postgres');

class PaymentService {
    // Create new payment
    static async createPayment(paymentData) {
        const { amount, slot_id, patient_id } = paymentData;

        if (!amount || !slot_id || !patient_id) {
            throw new Error('All fields are required');
        }

        const result = await query(
            `INSERT INTO payments (amount, slot_id, patient_id, status)
             VALUES ($1, $2, $3, 'PENDING')
             RETURNING *`,
            [amount, slot_id, patient_id]
        );
        return result.rows[0];
    }

    // Update payment status
    static async updatePaymentStatus(paymentId, status, transactionId = null) {
        const result = await query(
            `UPDATE payments 
             SET status = $1, transaction_id = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [status, transactionId, paymentId]
        );
        return result.rows[0];
    }

    // Get all payments
    static async getPayments() {
        const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
        return result.rows;
    }

    // Get payments by user ID
    static async getPaymentsByUserId(userId) {
        if (!userId) {
            throw new Error('User id required');
        }

        const result = await query(
            'SELECT * FROM payments WHERE patient_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('No payments found for this user');
        }

        return result.rows;
    }

    // Get payment by ID
    static async getPaymentById(id) {
        const result = await query('SELECT * FROM payments WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            throw new Error('Payment not found');
        }

        return result.rows[0];
    }

    // Get payment by appointment ID
    static async getPaymentByAppointmentId(appointmentId) {
        const result = await query(
            'SELECT * FROM payments WHERE appointment_id = $1 ORDER BY created_at DESC',
            [appointmentId]
        );

        if (result.rows.length === 0) {
            throw new Error('Payment not found');
        }

        return result.rows[0];
    }

    // Get payments by status
    static async getPaymentsByStatus(status) {
        if (!status) {
            throw new Error('Status is required');
        }

        const result = await query(
            'SELECT * FROM payments WHERE status = $1 ORDER BY created_at DESC',
            [status]
        );
        return result.rows;
    }

    // Delete payment
    static async deletePayment(paymentId, user) {
        const payment = await this.getPaymentById(paymentId);
        
        if (!payment) {
            throw new Error('Payment not found');
        }

        // Only admin or the patient who created the payment can delete it
        if (user.userType !== 'admin' && payment.patient_id !== user.userId) {
            throw new Error('Access denied');
        }

        const result = await query(
            'DELETE FROM payments WHERE id = $1 RETURNING *',
            [paymentId]
        );
        return result.rows[0];
    }

    // Get doctor revenue statistics
    static async getDoctorRevenue(slotIds = [], period = 'monthly') {
        const validPeriods = ['daily', 'weekly', 'monthly'];
        if (!validPeriods.includes(period)) {
            throw new Error('Invalid period. Use daily, weekly, or monthly.');
        }

        let whereClause = 'WHERE p.status = \'SUCCESS\'';
        let params = [];

        if (slotIds.length > 0) {
            whereClause += ` AND s.id = ANY($${params.length + 1})`;
            params.push(slotIds);
        }

        let groupBy;
        switch (period) {
            case 'daily':
                groupBy = 'DATE(p.created_at)';
                break;
            case 'weekly':
                groupBy = 'DATE_TRUNC(\'week\', p.created_at)';
                break;
            case 'monthly':
                groupBy = 'DATE_TRUNC(\'month\', p.created_at)';
                break;
        }

        const queryText = `
            SELECT 
                ${groupBy} as period,
                COUNT(*) as payment_count,
                COALESCE(SUM(p.amount), 0) as revenue
            FROM payments p
            ${whereClause}
            GROUP BY ${groupBy}
            ORDER BY period DESC
            LIMIT 30
        `;

        const result = await query(queryText, params);
        return result.rows;
    }
}

module.exports = {
    createPayment,
    updatePaymentStatus,
    getPayments,
    getPaymentsByUserId,
    getPaymentById,
    getPaymentByAppointmentId,
    getPaymentsByStatus,
    deletePayment
};
