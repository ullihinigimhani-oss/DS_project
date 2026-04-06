const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/doctors', appointmentController.listDoctors);
router.get('/doctors/:doctorId/slots', appointmentController.getDoctorAvailableSlots);

router.get('/doctor', authMiddleware, appointmentController.getDoctorAppointments);
router.put('/:id/approve', authMiddleware, appointmentController.approveAppointment);

router.post('/', authMiddleware, appointmentController.createBooking);
router.get('/', authMiddleware, appointmentController.getMyBookings);
router.put('/:id/cancel', authMiddleware, appointmentController.cancelBooking);

router.get('/:id/messages', authMiddleware, appointmentController.getMessages);
router.post('/:id/messages', authMiddleware, appointmentController.sendMessage);

module.exports = router;
