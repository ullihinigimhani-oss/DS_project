const { query } = require('../config/postgres');

class AppointmentMessage {
    // Create new message
    static async create(messageData) {
        const {
            appointment_id,
            sender_id,
            sender_role,
            message
        } = messageData;

        const result = await query(
            `INSERT INTO appointment_messages (appointment_id, sender_id, sender_role, message)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [appointment_id, sender_id, sender_role, message.trim()]
        );
        return result.rows[0];
    }

    // Get messages by appointment ID
    static async findByAppointmentId(appointmentId) {
        const result = await query(
            `SELECT * FROM appointment_messages 
             WHERE appointment_id = $1 
             ORDER BY sent_at ASC`,
            [appointmentId]
        );
        return result.rows;
    }

    // Find message by ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM appointment_messages WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    // Verify user access to appointment (for messaging)
    static async verifyAppointmentAccess(appointmentId, userId) {
        const result = await query(
            'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
            [appointmentId]
        );
        const appointment = result.rows[0];
        
        if (!appointment) {
            return null;
        }

        const { patient_id, doctor_id } = appointment;
        if (userId !== patient_id && userId !== doctor_id) {
            return null;
        }

        return appointment;
    }

    // Get message count by appointment
    static async getCountByAppointmentId(appointmentId) {
        const result = await query(
            'SELECT COUNT(*) as count FROM appointment_messages WHERE appointment_id = $1',
            [appointmentId]
        );
        return parseInt(result.rows[0].count);
    }

    // Get recent messages for an appointment
    static async getRecentByAppointmentId(appointmentId, limit = 10) {
        const result = await query(
            `SELECT * FROM appointment_messages 
             WHERE appointment_id = $1 
             ORDER BY sent_at DESC 
             LIMIT $2`,
            [appointmentId, limit]
        );
        return result.rows.reverse(); // Reverse to show chronological order
    }

    // Delete messages by appointment ID
    static async deleteByAppointmentId(appointmentId) {
        const result = await query(
            'DELETE FROM appointment_messages WHERE appointment_id = $1',
            [appointmentId]
        );
        return result.rowCount;
    }
}

module.exports = AppointmentMessage;
