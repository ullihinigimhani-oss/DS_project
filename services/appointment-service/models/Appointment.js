const { query } = require('../config/postgres');

class Appointment {
    // Create new appointment
    static async create(appointmentData) {
        const {
            patient_id,
            doctor_id,
            slot_id,
            appointment_date,
            start_time,
            end_time,
            reason,
            doctor_name,
            patient_name,
            patient_phone,
            is_telemedicine
        } = appointmentData;

        const result = await query(
            `INSERT INTO appointments
                (patient_id, doctor_id, slot_id, appointment_date, start_time, end_time, reason, doctor_name, patient_name, patient_phone, status, is_telemedicine)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
             RETURNING *`,
            [patient_id, doctor_id, slot_id || null, appointment_date, start_time, end_time, reason || null, doctor_name || null, patient_name || null, patient_phone || null, is_telemedicine === true]
        );
        return result.rows[0];
    }

    // Find appointment by ID
    static async findById(id) {
        const result = await query('SELECT * FROM appointments WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Update appointment status
    static async updateStatus(id, status) {
        const result = await query(
            `UPDATE appointments 
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    // Get appointments by patient ID
    static async findByPatientId(patientId, status = null) {
        let queryText = 'SELECT * FROM appointments WHERE patient_id = $1';
        let params = [patientId];

        if (status) {
            queryText += ' AND status = $2';
            params.push(status);
        }

        queryText += ' ORDER BY appointment_date DESC, start_time DESC';

        const result = await query(queryText, params);
        return result.rows;
    }

    // Get appointments by doctor ID
    static async findByDoctorId(doctorId, filter = null) {
        let queryText = 'SELECT * FROM appointments WHERE doctor_id = $1 AND status != \'cancelled\'';
        let params = [doctorId];

        if (filter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            queryText += ` AND appointment_date = '${today}'`;
        } else if (filter === 'upcoming') {
            const today = new Date().toISOString().split('T')[0];
            queryText += ` AND appointment_date >= '${today}'`;
        }

        queryText += ' ORDER BY appointment_date ASC, start_time ASC';

        const result = await query(queryText, params);
        return result.rows;
    }

    // Check for existing booking at same slot
    static async findExistingBooking(doctorId, appointmentDate, startTime) {
        const result = await query(
            `SELECT id FROM appointments
             WHERE doctor_id = $1
               AND appointment_date = $2
               AND start_time = $3
               AND status != 'cancelled'`,
            [doctorId, appointmentDate, startTime]
        );
        return result.rows[0];
    }

    // Get booked slots for a doctor in a date range
    static async getBookedSlots(doctorId, startDate, endDate) {
        const result = await query(
            `SELECT appointment_date, start_time FROM appointments
             WHERE doctor_id = $1
               AND appointment_date BETWEEN $2 AND $3
               AND status != 'cancelled'`,
            [doctorId, startDate, endDate]
        );
        return result.rows;
    }

    // Get appointments for reminder (24-25 hours from now)
    static async getUpcomingForReminder() {
        const result = await query(
            `SELECT id, patient_id, doctor_id, patient_name, patient_phone,
                    doctor_name, appointment_date, start_time, status
             FROM appointments
             WHERE status IN ('pending', 'confirmed')
               AND (appointment_date + start_time::interval)
                   BETWEEN (NOW() + INTERVAL '23 hours') AND (NOW() + INTERVAL '25 hours')`
        );
        return result.rows;
    }

    // Get admin statistics
    static async getStats(year = null, month = null) {
        let totalQuery = 'SELECT COUNT(*) AS total FROM appointments';
        let monthQuery = `SELECT COUNT(*) AS count FROM appointments WHERE status != 'cancelled'`;
        let statusQuery = 'SELECT status, COUNT(*) AS count FROM appointments GROUP BY status';

        let params = [];

        if (year && month) {
            const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            totalQuery += ' WHERE appointment_date BETWEEN $1 AND $2';
            monthQuery += ' AND appointment_date BETWEEN $1 AND $2';
            statusQuery += ' WHERE appointment_date BETWEEN $1 AND $2 GROUP BY status';
            params = [dateFrom, dateTo];
        } else {
            const firstOfMonth = new Date().toISOString().split('T')[0].slice(0, 8) + '01';
            monthQuery += ` AND appointment_date >= $1`;
            params = [firstOfMonth];
        }

        const [totalRes, monthRes, statusRes] = await Promise.all([
            query(totalQuery, params),
            query(monthQuery, params),
            query(statusQuery, params)
        ]);

        const byStatus = {};
        statusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count); });

        return {
            total: parseInt(totalRes.rows[0].total),
            thisMonth: parseInt(monthRes.rows[0].count),
            byStatus
        };
    }
}

module.exports = Appointment;
