const db = require('../config/postgres');
const axios = require('axios');

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003';

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

exports.listDoctors = async (req, res) => {
  try {
    const response = await axios.get(`${DOCTOR_SERVICE_URL}/api/v1/public/doctors`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Failed to fetch doctors from doctor-service:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
};

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
      bookedResult.rows.map((r) => {
        const d = new Date(r.appointment_date).toISOString().split('T')[0];
        const t = r.start_time.substring(0, 5);
        return `${d}|${t}`;
      })
    );

    const annotated = slots.map((slot) => {
      const dow = slot.day_of_week;
      let offset = dow - 1;
      if (dow === 0) offset = 6;

      const slotDate = new Date(monday);
      slotDate.setDate(monday.getDate() + offset);
      const appointmentDate = toDateStr(slotDate);
      const startHHMM = slot.start_time.substring(0, 5);
      const isBooked = bookedSet.has(`${appointmentDate}|${startHHMM}`);

      return { ...slot, appointmentDate, isBooked };
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

exports.createBooking = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { doctorId, slotId, appointmentDate, startTime, endTime, reason, doctorName, patientName } = req.body;

    if (!doctorId || !appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, appointmentDate, startTime, and endTime are required',
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
          (patient_id, doctor_id, slot_id, appointment_date, start_time, end_time, reason, doctor_name, patient_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [patientId, doctorId, slotId || null, appointmentDate, startTime, endTime, reason || null, doctorName || null, patientName || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
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
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
       WHERE doctor_id = $1 AND status != 'cancelled'${whereExtra}
       ORDER BY appointment_date ASC, start_time ASC`,
      [doctorId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
