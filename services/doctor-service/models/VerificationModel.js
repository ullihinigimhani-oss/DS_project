const db = require('../config/postgres');

const mapDocument = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    doctorId: row.doctor_id,
    documentType: row.document_type,
    documentUrl: row.document_url,
    publicId: row.public_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    savedAt: row.saved_at,
    status: row.status,
  };
};

const mapStatus = (row, doctorId = null) => {
  if (!row) {
    return {
      doctorId,
      status: 'pending',
      documentsSubmitted: 0,
      totalRequired: 4,
      lastUpdated: null,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };
  }

  return {
    doctorId: row.doctor_id,
    status: row.status,
    documentsSubmitted: row.documents_submitted,
    totalRequired: row.total_required,
    lastUpdated: row.last_updated,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
  };
};

class VerificationModel {
  static async saveDocument({
    doctorId,
    documentType,
    documentUrl,
    publicId,
    fileName,
    fileSize,
    uploadedAt,
  }) {
    const documentResult = await db.query(
      `INSERT INTO verification_documents
        (doctor_id, document_type, document_url, public_id, file_name, file_size, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [doctorId, documentType, documentUrl, publicId, fileName, fileSize, uploadedAt]
    );

    const status = await this.updateVerificationStatus(doctorId);

    return {
      document: mapDocument(documentResult.rows[0]),
      status,
    };
  }

  static async getDocumentsByDoctorId(doctorId) {
    const result = await db.query(
      `SELECT * FROM verification_documents
       WHERE doctor_id = $1
       ORDER BY saved_at DESC, uploaded_at DESC`,
      [doctorId]
    );

    return result.rows.map(mapDocument);
  }

  static async getDocumentById(documentId) {
    const result = await db.query('SELECT * FROM verification_documents WHERE id = $1', [documentId]);
    return mapDocument(result.rows[0]);
  }

  static async deleteDocument(documentId) {
    const result = await db.query(
      'DELETE FROM verification_documents WHERE id = $1 RETURNING id',
      [documentId]
    );
    return Boolean(result.rows[0]);
  }

  static async deleteDocumentsByDoctorId(doctorId) {
    await db.query('DELETE FROM verification_documents WHERE doctor_id = $1', [doctorId]);
  }

  static async updateVerificationStatus(doctorId) {
    const countResult = await db.query(
      'SELECT COUNT(*)::int AS count FROM verification_documents WHERE doctor_id = $1',
      [doctorId]
    );

    const documentsSubmitted = countResult.rows[0].count;
    const result = await db.query(
      `INSERT INTO verification_status (doctor_id, status, documents_submitted, total_required, last_updated)
       VALUES ($1, $2, $3, 4, CURRENT_TIMESTAMP)
       ON CONFLICT (doctor_id) DO UPDATE
         SET documents_submitted = EXCLUDED.documents_submitted,
             last_updated = CURRENT_TIMESTAMP,
             status = CASE
               WHEN verification_status.status IN ('approved', 'submitted_for_review', 'rejected')
                 THEN verification_status.status
               ELSE EXCLUDED.status
             END
       RETURNING *`,
      [doctorId, 'pending', documentsSubmitted]
    );

    return mapStatus(result.rows[0]);
  }

  static async getVerificationStatus(doctorId) {
    const result = await db.query('SELECT * FROM verification_status WHERE doctor_id = $1', [doctorId]);
    return mapStatus(result.rows[0], doctorId);
  }

  static async submitForVerification(doctorId) {
    const countResult = await db.query(
      'SELECT COUNT(*)::int AS count FROM verification_documents WHERE doctor_id = $1',
      [doctorId]
    );
    const documentsSubmitted = countResult.rows[0].count;

    const result = await db.query(
      `INSERT INTO verification_status
        (doctor_id, status, documents_submitted, total_required, last_updated, submitted_at, approved_at, rejected_at, rejection_reason)
       VALUES ($1, 'submitted_for_review', $2, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL, NULL)
       ON CONFLICT (doctor_id) DO UPDATE
         SET status = 'submitted_for_review',
             documents_submitted = EXCLUDED.documents_submitted,
             submitted_at = CURRENT_TIMESTAMP,
             approved_at = NULL,
             rejected_at = NULL,
             rejection_reason = NULL,
             last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, documentsSubmitted]
    );

    return mapStatus(result.rows[0]);
  }

  static async getAllSubmissions() {
    const result = await db.query(
      `SELECT
          vs.*,
          dp.name,
          dp.specialization,
          COALESCE(
            json_agg(
              json_build_object(
                'id', vd.id,
                'documentType', vd.document_type,
                'documentUrl', vd.document_url,
                'fileName', vd.file_name,
                'fileSize', vd.file_size,
                'uploadedAt', vd.uploaded_at,
                'savedAt', vd.saved_at,
                'status', vd.status
              )
              ORDER BY vd.saved_at DESC
            ) FILTER (WHERE vd.id IS NOT NULL),
            '[]'::json
          ) AS documents
       FROM verification_status vs
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = vs.doctor_id
       LEFT JOIN verification_documents vd ON vd.doctor_id = vs.doctor_id
       GROUP BY vs.doctor_id, dp.name, dp.specialization
       ORDER BY vs.last_updated DESC`
    );

    return result.rows.map((row) => ({
      ...mapStatus(row),
      name: row.name,
      specialization: row.specialization,
      documents: row.documents,
    }));
  }

  static async approveVerification(doctorId) {
    const result = await db.query(
      `UPDATE verification_status
       SET status = 'approved',
           approved_at = CURRENT_TIMESTAMP,
           rejected_at = NULL,
           rejection_reason = NULL,
           last_updated = CURRENT_TIMESTAMP
       WHERE doctor_id = $1
       RETURNING *`,
      [doctorId]
    );

    return mapStatus(result.rows[0], doctorId);
  }

  static async rejectVerification(doctorId, reason) {
    const result = await db.query(
      `UPDATE verification_status
       SET status = 'rejected',
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           approved_at = NULL,
           last_updated = CURRENT_TIMESTAMP
       WHERE doctor_id = $1
       RETURNING *`,
      [doctorId, reason]
    );

    return mapStatus(result.rows[0], doctorId);
  }
}

module.exports = VerificationModel;
