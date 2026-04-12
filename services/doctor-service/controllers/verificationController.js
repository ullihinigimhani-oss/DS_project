/**
 * Verification Controller
 * Handles doctor verification document uploads and status management
 * Files are stored locally in Docker volume
 */

const VerificationModel = require('../models/VerificationModel');
const { saveFile, deleteFile } = require('../utils/fileStorage');

/**
 * Upload a verification document (file-based)
 * POST /api/v1/verification/upload
 * Expects multipart/form-data with:
 * - file: PDF file
 * - documentType: license | government_id | credentials | insurance
 */
exports.uploadDocument = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'documentType is required',
      });
    }

    const validDocTypes = ['license', 'government_id', 'credentials', 'insurance'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}`,
      });
    }

    // Save file to disk
    const saveResult = await saveFile(file.buffer, file.originalname, doctorId);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save file',
        error: saveResult.error,
      });
    }

    // Save document metadata to database
    const { document, status } = await VerificationModel.saveDocument({
      doctorId,
      documentType,
      documentUrl: saveResult.documentUrl,
      publicId: null,
      fileName: saveResult.fileName,
      fileSize: file.size,
      uploadedAt: saveResult.uploadedAt,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document, status },
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to upload document', error: error.message });
  }
};

/**
 * Get all documents for a doctor
 * GET /api/v1/verification/documents/:doctorId
 */
exports.getDocuments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required' });
    }

    const documents = await VerificationModel.getDocumentsByDoctorId(doctorId);

    res.status(200).json({ success: true, data: documents, count: documents.length });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
};

/**
 * Get verification status for a doctor
 * GET /api/v1/verification/status/:doctorId
 */
exports.getStatus = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required' });
    }

    const status = await VerificationModel.getVerificationStatus(doctorId);

    res.status(200).json({ success: true, data: status });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: error.message,
    });
  }
};

/**
 * Delete a verification document
 * DELETE /api/v1/verification/documents/:documentId
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({ success: false, message: 'Document ID is required' });
    }

    const document = await VerificationModel.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete file from disk
    await deleteFile(document.documentUrl);

    // Delete from database
    const deleted = await VerificationModel.deleteDocument(documentId);
    if (!deleted) {
      return res.status(500).json({ success: false, message: 'Failed to delete document' });
    }

    const updatedStatus = await VerificationModel.updateVerificationStatus(document.doctorId);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      data: { documentId, status: updatedStatus },
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to delete document', error: error.message });
  }
};

/**
 * Submit documents for verification
 * POST /api/v1/verification/submit
 */
exports.submitForVerification = async (req, res) => {
  try {
    const doctorId = req.user.userId;

    const documents = await VerificationModel.getDocumentsByDoctorId(doctorId);
    if (documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents uploaded yet. Please upload at least one document.',
      });
    }

    const updatedStatus = await VerificationModel.submitForVerification(doctorId);

    res.status(200).json({
      success: true,
      message: 'Documents submitted for verification',
      data: updatedStatus,
    });
  } catch (error) {
    console.error('Error submitting for verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit for verification',
      error: error.message,
    });
  }
};

/**
 * Get all verification submissions (Admin only)
 * GET /api/v1/verification/all
 */
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await VerificationModel.getAllSubmissions();
    res.status(200).json({ success: true, data: submissions, count: submissions.length });
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch submissions', error: error.message });
  }
};

/**
 * Approve doctor verification (Admin only)
 * POST /api/v1/verification/approve/:doctorId
 * DELETES ALL ASSOCIATED DOCUMENTS AFTER APPROVAL
 */
exports.approveVerification = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required' });
    }

    const status = await VerificationModel.getVerificationStatus(doctorId);
    if (status.status !== 'submitted_for_review') {
      return res.status(400).json({
        success: false,
        message: 'Doctor verification is not in submitted state',
      });
    }

    // Approve verification (keep document records and files so admins retain an audit trail)
    const approvedStatus = await VerificationModel.approveVerification(doctorId);

    res.status(200).json({
      success: true,
      message: 'Doctor verification approved',
      data: approvedStatus,
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to approve verification', error: error.message });
  }
};

/**
 * Reject doctor verification (Admin only)
 * POST /api/v1/verification/reject/:doctorId
 * Documents remain stored for resubmission
 */
exports.rejectVerification = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required' });
    }

    const status = await VerificationModel.getVerificationStatus(doctorId);
    if (status.status !== 'submitted_for_review') {
      return res.status(400).json({
        success: false,
        message: 'Doctor verification is not in submitted state',
      });
    }

    const rejectedStatus = await VerificationModel.rejectVerification(
      doctorId,
      reason || 'No reason provided'
    );

    res
      .status(200)
      .json({ success: true, message: 'Doctor verification rejected', data: rejectedStatus });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to reject verification', error: error.message });
  }
};
