const express = require('express');
const multer = require('multer');
const router = express.Router();
const publicDoctorController = require('../controllers/publicDoctorController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

// Public - no auth required
router.get('/doctors', publicDoctorController.listDoctors);
router.get('/doctors/:doctorId/slots', publicDoctorController.getDoctorSlots);

// Authenticated - doctor manages their own public profile
router.get('/profile', authMiddleware, publicDoctorController.getProfile);
router.put('/profile', authMiddleware, publicDoctorController.updateProfile);
router.post('/profile/image', authMiddleware, upload.single('image'), publicDoctorController.uploadProfileImage);

module.exports = router;
