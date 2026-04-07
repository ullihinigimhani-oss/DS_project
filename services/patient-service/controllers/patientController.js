const db = require('../config/postgres');

const getPatients = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM patient_profiles ORDER BY created_at DESC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPatientById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM patient_profiles WHERE patient_id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPatient = async (req, res) => {
  try {
    const { patientId, bloodType, allergies, emergencyContact, notes } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }
    const result = await db.query(
      `INSERT INTO patient_profiles (patient_id, blood_type, allergies, emergency_contact, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (patient_id) DO UPDATE
         SET blood_type = EXCLUDED.blood_type,
             allergies = EXCLUDED.allergies,
             emergency_contact = EXCLUDED.emergency_contact,
             notes = EXCLUDED.notes,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [patientId, bloodType || null, allergies || null, emergencyContact || null, notes || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { bloodType, allergies, emergencyContact, notes } = req.body;
    const result = await db.query(
      `UPDATE patient_profiles
       SET blood_type = COALESCE($1, blood_type),
           allergies = COALESCE($2, allergies),
           emergency_contact = COALESCE($3, emergency_contact),
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $5
       RETURNING *`,
      [bloodType || null, allergies || null, emergencyContact || null, notes || null, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePatient = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM patient_profiles WHERE patient_id = $1 RETURNING patient_id`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    res.status(200).json({ success: true, message: `Patient ${req.params.id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPatients, getPatientById, createPatient, updatePatient, deletePatient };
