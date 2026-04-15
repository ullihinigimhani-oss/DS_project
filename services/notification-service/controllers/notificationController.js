const Notification = require('../models/Notification');

function parseReadFilter(value) {
  if (value === 'read') return true;
  if (value === 'unread') return false;
  if (value === true || value === false) return value;
  return undefined;
}

function buildFilters(query = {}) {
  return {
    type: query.type && query.type !== 'all' ? query.type : undefined,
    role: query.role && query.role !== 'all' ? query.role : undefined,
    search: query.search ? String(query.search).trim() : undefined,
    read: parseReadFilter(query.read),
    limit: query.limit ? Number(query.limit) : undefined,
  };
}

async function createNotifications(payload) {
  const items = Array.isArray(payload?.notifications) ? payload.notifications : [payload];
  return Promise.all(items.map((item) => Notification.create(item)));
}

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const filters = buildFilters(req.query);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.findByUserId(userId, filters),
      Notification.getUnreadCount(userId),
      Notification.countByUserId(userId, filters),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.findAll(filters),
      Notification.countAll({ ...filters, read: false }),
      Notification.countAll(filters),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const notifications = await createNotifications(req.body);

    return res.status(201).json({
      success: true,
      message: 'Notification created',
      data: Array.isArray(req.body?.notifications) ? notifications : notifications[0],
    });
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const sendInternalNotification = async (req, res) => {
  try {
    const notifications = await createNotifications(req.body);

    return res.status(201).json({
      success: true,
      message: 'Internal notification created',
      data: Array.isArray(req.body?.notifications) ? notifications : notifications[0],
    });
  } catch (error) {
    console.error('Error creating internal notification:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(Number(id));

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    const isAdmin = req.user?.user_type === 'admin';
    if (!isAdmin && String(notification.userId) !== String(req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this notification',
      });
    }

    const updatedNotification = await Notification.markAsRead(Number(id));

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const notifications = await Notification.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: notifications,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  getAllNotifications,
  sendNotification,
  sendInternalNotification,
  markAsRead,
  markAllAsRead,
};
