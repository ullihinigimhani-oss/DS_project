const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { internalServiceMiddleware } = require('../middlewares/internalServiceMiddleware');

const router = express.Router();

router.post('/internal', internalServiceMiddleware, notificationController.sendInternalNotification);

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.get('/all', adminMiddleware, notificationController.getAllNotifications);
router.post('/', adminMiddleware, notificationController.sendNotification);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
