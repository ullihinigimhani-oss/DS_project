const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/prescriptionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Doctor issues prescription to a patient
router.post('/', authMiddleware, ctrl.issuePrescription);

// Doctor views their own issued prescriptions
router.get('/my', authMiddleware, ctrl.getDoctorPrescriptions);

// Doctor views all prescriptions for a patient
router.get('/patient/:patientId', authMiddleware, ctrl.getPatientPrescriptions);

// Get a specific prescription by ID
router.get('/:id', authMiddleware, ctrl.getPrescriptionById);

module.exports = router;
