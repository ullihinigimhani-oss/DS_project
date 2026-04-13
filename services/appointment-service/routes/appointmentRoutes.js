const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware, requireRole } = require('../middlewares/auth');

// Public — patients browse doctors without logging in
router.get('/doctors', appointmentController.listDoctors);
router.get('/doctors/:doctorId/slots', appointmentController.getDoctorAvailableSlots);

// Admin stats
router.get('/admin/stats', authMiddleware, requireRole('admin'), appointmentController.getAdminStats);
router.get('/admin/all', authMiddleware, requireRole('admin'), appointmentController.getAllAppointmentsForAdmin);

// Doctor-facing — must be authenticated
router.get('/doctor', authMiddleware, appointmentController.getDoctorAppointments);
router.put('/:id/approve', authMiddleware, appointmentController.approveAppointment);
router.put('/:id/reject', authMiddleware, appointmentController.rejectAppointment);

// Authenticated — patient manages their own bookings
router.post('/', authMiddleware, appointmentController.createBooking);
router.get('/', authMiddleware, appointmentController.getMyBookings);
router.put('/:id/cancel', authMiddleware, appointmentController.cancelBooking);

// Messages — both doctor and patient
router.get('/:id/messages', authMiddleware, appointmentController.getMessages);
router.post('/:id/messages', authMiddleware, appointmentController.sendMessage);

module.exports = router;
