const express = require('express');
const router = express.Router();
const publicDoctorController = require('../controllers/publicDoctorController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Public - no auth required
router.get('/doctors', publicDoctorController.listDoctors);
router.get('/doctors/:doctorId/slots', publicDoctorController.getDoctorSlots);

// Authenticated - doctor manages their own public profile
router.get('/profile', authMiddleware, publicDoctorController.getProfile);
router.put('/profile', authMiddleware, publicDoctorController.updateProfile);

module.exports = router;
