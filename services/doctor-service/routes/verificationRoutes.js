const express = require('express');
const multer = require('multer');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authMiddleware, requireAdmin } = require('../middlewares/authMiddleware');

/**
 * Verification Routes
 * All routes under /api/v1/verification
 *
 * Files are uploaded directly to the backend and stored in a Docker volume.
 * When a doctor is verified, all documents are automatically deleted.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
  },
});

// Admin: get all submissions
router.get('/all', authMiddleware, requireAdmin, verificationController.getAllSubmissions);

// Doctor-protected routes
router.post('/upload', authMiddleware, upload.single('file'), verificationController.uploadDocument);
router.get('/documents/:doctorId', authMiddleware, verificationController.getDocuments);
router.get('/status/:doctorId', authMiddleware, verificationController.getStatus);
router.delete('/documents/:documentId', authMiddleware, verificationController.deleteDocument);
router.post('/submit', authMiddleware, verificationController.submitForVerification);

// Admin-only routes
router.post('/approve/:doctorId', authMiddleware, requireAdmin, verificationController.approveVerification);
router.post('/reject/:doctorId', authMiddleware, requireAdmin, verificationController.rejectVerification);

module.exports = router;
