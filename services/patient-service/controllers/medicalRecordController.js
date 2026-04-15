const db = require('../config/postgres');
const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/medical-records');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

exports.uploadRecord = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { title, category, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const validCategories = ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'other'];
    const cat = validCategories.includes(category) ? category : 'other';

    const patientDir = path.join(UPLOAD_DIR, String(patientId));
    await ensureDir(patientDir);

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${safeName}`;
    const filePath = path.join(patientDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    const fileUrl = `/uploads/medical-records/${patientId}/${fileName}`;

    const result = await db.query(
      `INSERT INTO medical_records (patient_id, title, category, description, file_name, file_path, file_url, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [patientId, title.trim(), cat, description || null, file.originalname, filePath, fileUrl, file.size, file.mimetype]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Medical record upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyRecords = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await db.query(
      `SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY uploaded_at DESC`,
      [patientId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM medical_records WHERE id = $1 AND patient_id = $2 RETURNING *`,
      [id, patientId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Record not found or access denied' });
    }

    fs.unlink(result.rows[0].file_path).catch(() => {});

    res.status(200).json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await db.query(
      `SELECT id, patient_id, title, category, description, file_name, file_url, file_size, uploaded_at
       FROM medical_records WHERE patient_id = $1 ORDER BY uploaded_at DESC`,
      [patientId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
