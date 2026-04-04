const http = require('http');
const https = require('https');
const db = require('../config/postgres');
const { sendDoctorEvent } = require('../config/kafka');

const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3004';

const fetchJson = (url, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('Request timed out'));
    });

    request.on('error', reject);
  });

/* ── POST /api/v1/prescriptions ───────────────────────────────── */
// Doctor issues a prescription to a patient
exports.issuePrescription = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { patientId, appointmentId, doctorName, patientName, medications, notes } = req.body;

    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'patientId and at least one medication are required',
      });
    }

    const result = await db.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, appointment_id, doctor_name, patient_name, medications, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        doctorId,
        patientId,
        appointmentId || null,
        doctorName || null,
        patientName || null,
        JSON.stringify(medications),
        notes || null,
      ]
    );

    const prescription = result.rows[0];

    // Notify the patient via Kafka
    await sendDoctorEvent('PRESCRIPTION_ISSUED', {
      prescriptionId: prescription.id,
      doctorId: prescription.doctor_id,
      patientId: prescription.patient_id,
      doctorName: prescription.doctor_name,
      patientName: prescription.patient_name,
      appointmentId: prescription.appointment_id,
      medicationCount: prescription.medications.length,
    });

    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error issuing prescription:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ── GET /api/v1/prescriptions/my ─────────────────────────────── */
// Doctor views prescriptions they have issued
exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const result = await db.query(
      `SELECT * FROM prescriptions WHERE doctor_id = $1 ORDER BY created_at DESC`,
      [doctorId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ── GET /api/v1/prescriptions/patient/:patientId ─────────────── */
// Doctor views all prescriptions for a specific patient
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Standalone prescriptions from doctor-service
    const localResult = await db.query(
      `SELECT *, 'standalone' AS source FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );

    // Appointment-linked prescriptions from appointment-service (best-effort)
    let appointmentPrescriptions = [];
    try {
      const response = await fetchJson(
        `${APPOINTMENT_SERVICE_URL}/api/prescriptions/internal/patient/${patientId}`,
        3000
      );
      if (response && response.success) {
        appointmentPrescriptions = (response.data || []).map((p) => ({
          ...p,
          source: 'appointment',
        }));
      }
    } catch (fetchErr) {
      console.warn('Could not fetch appointment-service prescriptions:', fetchErr.message);
    }

    const combined = [...localResult.rows, ...appointmentPrescriptions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ── GET /api/v1/prescriptions/:id ────────────────────────────── */
exports.getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM prescriptions WHERE id = $1`, [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
