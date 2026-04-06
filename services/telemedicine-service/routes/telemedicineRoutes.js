const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/telemedicineController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/sessions', ctrl.createSession);
router.get('/sessions/appointment/:appointmentId', authMiddleware, ctrl.getSessionByAppointment);
router.get('/sessions/:id', authMiddleware, ctrl.getSessionById);
router.get('/sessions', authMiddleware, ctrl.getSessions);
router.put('/sessions/:id/end', authMiddleware, ctrl.endSession);

module.exports = router;
