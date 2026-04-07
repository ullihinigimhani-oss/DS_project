const db = require('../config/postgres');
const crypto = require('crypto');

const JITSI_BASE = process.env.JITSI_BASE_URL || 'https://meet.jit.si';

function generateRoomName(appointmentId) {
  const hash = crypto
    .createHash('sha256')
    .update(appointmentId)
    .digest('hex')
    .substring(0, 16);

  return `MediConnect-${hash}`;
}

const createSession = async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId } = req.body;

    if (!appointmentId || !patientId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId, patientId, and doctorId are required',
      });
    }

    const existing = await db.query(
      'SELECT * FROM telemedicine_sessions WHERE appointment_id = $1',
      [appointmentId]
    );

    if (existing.rows[0]) {
      return res.status(200).json({ success: true, data: existing.rows[0] });
    }

    const meetingRoom = generateRoomName(appointmentId);
    const meetingUrl = `${JITSI_BASE.replace(/\/$/, '')}/${meetingRoom}`;

    const result = await db.query(
      `INSERT INTO telemedicine_sessions
        (appointment_id, patient_id, doctor_id, meeting_room, meeting_url, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [appointmentId, patientId, doctorId, meetingRoom, meetingUrl]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating telemedicine session:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT * FROM telemedicine_sessions
       WHERE patient_id = $1 OR doctor_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSessionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT * FROM telemedicine_sessions WHERE appointment_id = $1',
      [appointmentId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'No telemedicine session found for this appointment',
      });
    }

    const session = result.rows[0];
    if (session.patient_id !== userId && session.doctor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT * FROM telemedicine_sessions WHERE id = $1',
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = result.rows[0];
    if (session.patient_id !== userId && session.doctor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existing = await db.query(
      'SELECT * FROM telemedicine_sessions WHERE id = $1',
      [id]
    );

    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (existing.rows[0].doctor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the doctor can end the session',
      });
    }

    const result = await db.query(
      `UPDATE telemedicine_sessions
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSessions,
  getSessionById,
  getSessionByAppointment,
  createSession,
  endSession,
};
