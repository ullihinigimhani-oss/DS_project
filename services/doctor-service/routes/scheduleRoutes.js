const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// All routes require authentication
router.get('/', authMiddleware, scheduleController.getSchedule);
router.post('/type', authMiddleware, scheduleController.setScheduleType);
router.post('/slots', authMiddleware, scheduleController.addSlot);
router.put('/slots/:slotId/availability', authMiddleware, scheduleController.toggleSlotAvailability);
router.delete('/slots/:slotId', authMiddleware, scheduleController.deleteSlot);
router.post('/reset-week', authMiddleware, scheduleController.resetWeek);

module.exports = router;
