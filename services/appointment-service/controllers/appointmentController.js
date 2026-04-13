const db = require('../config/postgres');
const axios = require('axios');
const { sendAppointmentEvent } = require('../config/kafka');

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003';
const TELEMEDICINE_SERVICE_URL = process.env.TELEMEDICINE_SERVICE_URL || 'http://localhost:3005';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';

/* ── helpers ───────────────────────────────────────────────────── */

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function toDateStr(date) {
    return date.toISOString().split('T')[0];
}

function toMinutes(timeValue) {
    const [hours, minutes] = String(timeValue || '00:00').slice(0, 5).split(':').map(Number);
    return (hours * 60) + (minutes || 0);
}

function toTimeString(totalMinutes) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/* ── GET /api/v1/appointments/doctors ──────────────────────────── */
// Proxy: list approved doctors from doctor-service (public)
exports.listDoctors = async (req, res) => {
    try {
        const response = await axios.get(`${DOCTOR_SERVICE_URL}/api/v1/public/doctors`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Failed to fetch doctors from doctor-service:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
    }
};

/* ── GET /api/v1/appointments/doctors/:doctorId/slots ───────────── */
// Returns doctor's available 15-minute slots for a week, annotated with booking usage
exports.getDoctorAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const weekStart = req.query.weekStart || toDateStr(getMonday(new Date()));

        const response = await axios.get(
            `${DOCTOR_SERVICE_URL}/api/v1/public/doctors/${doctorId}/slots`,
            { params: { weekStart } }
        );

        const { slots = [], scheduleType } = response.data.data || {};

        const monday = new Date(weekStart + 'T00:00:00');
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const bookedResult = await db.query(
            `SELECT appointment_date, start_time FROM appointments
             WHERE doctor_id = $1
               AND appointment_date BETWEEN $2 AND $3
               AND status != 'cancelled'`,
            [doctorId, toDateStr(monday), toDateStr(sunday)]
        );

        const bookedSet = new Set(
            bookedResult.rows.map(r => {
                const d = new Date(r.appointment_date).toISOString().split('T')[0];
                const t = r.start_time.substring(0, 5);
                return `${d}|${t}`;
            })
        );

        const expandedSlots = [];
        const groupedUsage = new Map();

        slots.forEach(slot => {
            const dow = slot.day_of_week;
            let offset = dow - 1;
            if (dow === 0) offset = 6;

            const slotDate = new Date(monday);
            slotDate.setDate(monday.getDate() + offset);
            const appointmentDate = toDateStr(slotDate);
            const slotStart = toMinutes(slot.start_time);
            const slotEnd = toMinutes(slot.end_time);
            const key = `${appointmentDate}|${slot.start_time.substring(0, 5)}|${slot.end_time.substring(0, 5)}`;

            if (!groupedUsage.has(key)) {
                groupedUsage.set(key, { total: 0, booked: 0 });
            }

            for (let start = slotStart; start + 15 <= slotEnd; start += 15) {
                const startHHMM = toTimeString(start);
                const endHHMM = toTimeString(start + 15);
                const isBooked = bookedSet.has(`${appointmentDate}|${startHHMM}`);
                const usage = groupedUsage.get(key);
                usage.total += 1;
                if (isBooked) usage.booked += 1;

                expandedSlots.push({
                    ...slot,
                    appointmentDate,
                    start_time: startHHMM,
                    end_time: endHHMM,
                    isBooked,
                    source_slot_start_time: slot.start_time,
                    source_slot_end_time: slot.end_time,
                    slot_group_key: key,
                });
            }
        });

        const annotated = expandedSlots.map(slot => {
            const usage = groupedUsage.get(slot.slot_group_key) || { total: 0, booked: 0 };
            return {
                ...slot,
                totalAppointmentsInWindow: usage.total,
                bookedAppointmentsInWindow: usage.booked,
                remainingAppointmentsInWindow: Math.max(usage.total - usage.booked, 0),
            };
        });

        res.status(200).json({
            success: true,
            data: { scheduleType, weekStart, slots: annotated },
        });
    } catch (error) {
        console.error('Error fetching doctor slots:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch slots' });
    }
};

/* ── POST /api/v1/appointments ─────────────────────────────────── */
exports.createBooking = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { doctorId, slotId, appointmentDate, startTime, endTime, reason, doctorName, patientName, isTelemedicine } = req.body;
        let { patientPhone } = req.body;

        if (!doctorId || !appointmentDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'doctorId, appointmentDate, startTime, and endTime are required',
            });
        }

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                message: 'reason is required',
            });
        }

        if (!patientName || !String(patientName).trim()) {
            return res.status(400).json({
                success: false,
                message: 'patientName is required',
            });
        }

        // Resolve patientPhone from auth-service if not provided by the frontend
        if (!patientPhone) {
            try {
                const userRes = await axios.get(
                    `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/v1/internal/users/${patientId}` 
                );
                patientPhone = userRes.data?.data?.phone || null;
            } catch (err) {
                console.warn('Could not resolve patientPhone from auth-service:', err.message);
            }
        }

        if (!patientPhone || !String(patientPhone).trim()) {
            return res.status(400).json({
                success: false,
                message: 'patientPhone is required',
            });
        }

        const existing = await db.query(
            `SELECT id FROM appointments
             WHERE doctor_id = $1
               AND appointment_date = $2
               AND start_time = $3
               AND status != 'cancelled'`,
            [doctorId, appointmentDate, startTime]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This slot has already been booked. Please choose another time.',
            });
        }

        const result = await db.query(
            `INSERT INTO appointments
                (patient_id, doctor_id, slot_id, appointment_date, start_time, end_time, reason, doctor_name, patient_name, patient_phone, status, is_telemedicine, payment_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, 'unpaid')
             RETURNING *`,
            [patientId, doctorId, slotId || null, appointmentDate, startTime, endTime, reason || null, doctorName || null, patientName || null, patientPhone || null, isTelemedicine === true]
        );

        const appointment = result.rows[0];

        // Publish event so notification-service can notify the patient of the pending request
        await sendAppointmentEvent('APPOINTMENT_PENDING', {
            appointmentId: appointment.id,
            patientId: appointment.patient_id,
            doctorId: appointment.doctor_id,
            patientName: appointment.patient_name,
            patientPhone: appointment.patient_phone,
            doctorName: appointment.doctor_name,
            appointmentDate: appointment.appointment_date,
            startTime: appointment.start_time,
            status: appointment.status,
        });

        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'This slot has already been booked. Please choose another time.',
            });
        }
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── PUT /api/v1/appointments/:id/payment-confirmed ───────────── */
exports.confirmBookingPayment = async (req, res) => {
    try {
        const patientId = req.user?.userId || req.user?.id || req.user?.sub;
        const { id } = req.params;

        if (!patientId) {
            return res.status(401).json({
                success: false,
                message: 'Unable to resolve authenticated user id',
            });
        }

        const result = await db.query(
            `UPDATE appointments
             SET status = 'pending',
                 payment_status = 'paid',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND patient_id = $2
               AND status IN ('pending', 'confirmed')
             RETURNING *`,
            [id, patientId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...result.rows[0],
                payment_status: 'paid',
                payment_label: 'paid',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── GET /api/v1/appointments ──────────────────────────────────── */
exports.getMyBookings = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { status } = req.query;
        const params = [patientId];
        let filterClause = '';

        if (status) {
            filterClause = ` AND status = $2`;
            params.push(status);
        }

        const result = await db.query(
            `SELECT * FROM appointments
             WHERE patient_id = $1${filterClause}
             ORDER BY appointment_date DESC, start_time DESC`,
            params
        );

        const enrichedRows = result.rows.map((appointment) => ({
            ...appointment,
            payment_status: appointment.payment_status || 'unpaid',
            payment_label: (appointment.payment_status || 'unpaid') === 'paid' ? 'paid' : 'unpaid',
        }));

        res.status(200).json({ success: true, data: enrichedRows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── PUT /api/v1/appointments/:id/cancel ───────────────────────── */
exports.cancelBooking = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { id } = req.params;

        const result = await db.query(
            `UPDATE appointments
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND patient_id = $2 AND status IN ('pending','confirmed')
             RETURNING *`,
            [id, patientId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or already cancelled',
            });
        }

        const cancelled = result.rows[0];

        // Notify doctor that the patient cancelled, and confirm to the patient
        await sendAppointmentEvent('APPOINTMENT_CANCELLED', {
            appointmentId: cancelled.id,
            patientId: cancelled.patient_id,
            doctorId: cancelled.doctor_id,
            patientName: cancelled.patient_name,
            doctorName: cancelled.doctor_name,
            appointmentDate: cancelled.appointment_date,
            startTime: cancelled.start_time,
            cancelledBy: 'patient',
        });

        res.status(200).json({ success: true, data: cancelled });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── GET /api/v1/appointments/doctor ───────────────────────────── */
exports.getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { filter } = req.query;
        const today = new Date().toISOString().split('T')[0];

        let whereExtra = '';
        if (filter === 'today') {
            whereExtra = ` AND appointment_date = '${today}'`;
        } else if (filter === 'upcoming') {
            whereExtra = ` AND appointment_date >= '${today}'`;
        }

        const result = await db.query(
            `SELECT * FROM appointments
             WHERE doctor_id = $1
               AND status != 'cancelled'
               AND payment_status = 'paid'${whereExtra}
             ORDER BY appointment_date ASC, start_time ASC`,
            [doctorId]
        );

        // Enrich with patient emails from auth service
        const rows = result.rows;
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
        const uniquePatientIds = [...new Set(rows.map(r => r.patient_id))];
        const emailMap = {};
        await Promise.all(
            uniquePatientIds.map(async (patientId) => {
                try {
                    const resp = await axios.get(`${AUTH_SERVICE_URL}/api/v1/internal/users/${patientId}`);
                    if (resp.data && resp.data.data) {
                        emailMap[patientId] = resp.data.data.email || '';
                    }
                } catch {
                    emailMap[patientId] = '';
                }
            })
        );

        const enriched = rows.map(r => ({
            ...r,
            patient_email: emailMap[r.patient_id] || '',
            payment_status: r.payment_status || 'unpaid',
            payment_label: (r.payment_status || 'unpaid') === 'paid' ? 'paid' : 'unpaid',
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── PUT /api/v1/appointments/:id/approve ──────────────────────── */
exports.approveAppointment = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;

        const result = await db.query(
            `UPDATE appointments
             SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
             RETURNING *`,
            [id, doctorId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not in pending state',
            });
        }

        const approved = result.rows[0];

        // Publish confirmation event so notification-service can send SMS to patient
        await sendAppointmentEvent('APPOINTMENT_BOOKED', {
            appointmentId: approved.id,
            patientId: approved.patient_id,
            doctorId: approved.doctor_id,
            patientName: approved.patient_name,
            patientPhone: approved.patient_phone,
            doctorName: approved.doctor_name,
            appointmentDate: approved.appointment_date,
            startTime: approved.start_time,
            status: approved.status,
        });

        // If this is a telemedicine appointment, create a session in telemedicine service
        if (approved.is_telemedicine) {
            try {
                await axios.post(`${TELEMEDICINE_SERVICE_URL}/api/telemedicine/sessions`, {
                    appointmentId: approved.id,
                    patientId: approved.patient_id,
                    doctorId: approved.doctor_id,
                });
            } catch (err) {
                console.error('Failed to create telemedicine session:', err.message);
                // Non-fatal — approval still succeeds
            }
        }

        res.status(200).json({ success: true, data: approved });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── PUT /api/v1/appointments/:id/reject ───────────────────────── */
exports.rejectAppointment = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;

        const result = await db.query(
            `UPDATE appointments
             SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
             RETURNING *`,
            [id, doctorId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not in pending state',
            });
        }

        const rejected = result.rows[0];

        // Notify the patient their request was rejected
        await sendAppointmentEvent('APPOINTMENT_REJECTED', {
            appointmentId: rejected.id,
            patientId: rejected.patient_id,
            doctorId: rejected.doctor_id,
            patientName: rejected.patient_name,
            doctorName: rejected.doctor_name,
            appointmentDate: rejected.appointment_date,
            startTime: rejected.start_time,
            reason: reason || null,
        });

        res.status(200).json({ success: true, data: rejected });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── POST /api/v1/appointments/:id/messages ────────────────────── */
exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const senderId = req.user.userId;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        }

        const appt = await db.query(
            'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
            [id]
        );
        if (!appt.rows[0]) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const { patient_id, doctor_id } = appt.rows[0];
        if (senderId !== patient_id && senderId !== doctor_id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const senderRole = senderId === doctor_id ? 'doctor' : 'patient';

        const result = await db.query(
            `INSERT INTO appointment_messages (appointment_id, sender_id, sender_role, message)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, senderId, senderRole, message.trim()]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── GET /api/v1/appointments/:id/messages ─────────────────────── */
exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const appt = await db.query(
            'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
            [id]
        );
        if (!appt.rows[0]) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const { patient_id, doctor_id } = appt.rows[0];
        if (userId !== patient_id && userId !== doctor_id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await db.query(
            `SELECT * FROM appointment_messages WHERE appointment_id = $1 ORDER BY sent_at ASC`,
            [id]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── GET /api/v1/appointments/admin/stats ──────────────────────── */
exports.getAdminStats = async (req, res) => {
    try {
        const now = new Date();
        const reqYear = parseInt(req.query.year);
        const reqMonth = parseInt(req.query.month);
        const hasFilter = !isNaN(reqYear) && !isNaN(reqMonth) && reqMonth >= 1 && reqMonth <= 12;

        let totalRes, monthRes, statusRes;

        if (hasFilter) {
            const dateFrom = `${reqYear}-${String(reqMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(reqYear, reqMonth, 0).getDate();
            const dateTo = `${reqYear}-${String(reqMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            [totalRes, monthRes, statusRes] = await Promise.all([
                db.query(
                    `SELECT COUNT(*) AS total FROM appointments WHERE appointment_date BETWEEN $1 AND $2`,
                    [dateFrom, dateTo]
                ),
                db.query(
                    `SELECT COUNT(*) AS count FROM appointments WHERE appointment_date BETWEEN $1 AND $2 AND status != 'cancelled'`,
                    [dateFrom, dateTo]
                ),
                db.query(
                    `SELECT status, COUNT(*) AS count FROM appointments WHERE appointment_date BETWEEN $1 AND $2 GROUP BY status`,
                    [dateFrom, dateTo]
                ),
            ]);
        } else {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString().split('T')[0];
            [totalRes, monthRes, statusRes] = await Promise.all([
                db.query(`SELECT COUNT(*) AS total FROM appointments`),
                db.query(
                    `SELECT COUNT(*) AS count FROM appointments WHERE appointment_date >= $1 AND status != 'cancelled'`,
                    [firstOfMonth]
                ),
                db.query(`SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`),
            ]);
        }

        const byStatus = {};
        statusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count); });

        res.status(200).json({
            success: true,
            data: {
                total: parseInt(totalRes.rows[0].total),
                thisMonth: parseInt(monthRes.rows[0].count),
                byStatus,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ── GET /api/v1/appointments/admin/all ───────────────────────────────────── */
exports.getAllAppointmentsForAdmin = async (req, res) => {
    try {
        const { status = '', search = '', limit = 100 } = req.query;
        const cappedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
        const params = [];
        const conditions = [];

        if (status && status !== 'all') {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }

        if (search) {
            params.push(`%${String(search).trim().toLowerCase()}%`);
            conditions.push(`(
                LOWER(COALESCE(patient_name, '')) LIKE $${params.length}
                OR LOWER(COALESCE(doctor_name, '')) LIKE $${params.length}
                OR LOWER(COALESCE(patient_id, '')) LIKE $${params.length}
                OR LOWER(COALESCE(doctor_id, '')) LIKE $${params.length}
            )`);
        }

        params.push(cappedLimit);
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await db.query(
            `SELECT *
             FROM appointments
             ${whereClause}
             ORDER BY appointment_date DESC, start_time DESC
             LIMIT $${params.length}`,
            params
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
