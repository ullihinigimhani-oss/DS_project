const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;

    console.log(`Fetching notifications for userId: ${userId}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const notifications = await Notification.findByUserId(userId);
    const unreadCount = await Notification.getUnreadCount(userId);

    console.log(`Found ${notifications.length} notifications (${unreadCount} unread)`);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    console.log(`Creating notification for userId: ${userId}, type: ${type}`);

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, type, title, and message are required',
      });
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
    });

    console.log('Notification created:', notification);

    return res.status(201).json({
      success: true,
      message: 'Notification created',
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.markAsRead(Number(id));

    console.log(`Marked notification ${id} as read`);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log(`Marking all notifications as read for userId: ${userId}`);

    const notifications = await Notification.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: notifications,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getNotifications,
  sendNotification,
  markAsRead,
  markAllAsRead,
};
