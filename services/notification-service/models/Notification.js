const { pool } = require('../config/postgres');

const mapRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  read: row.read,
  data: row.data || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const Notification = {
  create: async (notificationData) => {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {}),
      ]
    );

    return mapRow(rows[0]);
  },

  findByUserId: async (userId) => {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map(mapRow);
  },

  getUnreadCount: async (userId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return parseInt(rows[0].count, 10);
  },

  markAsRead: async (notificationId) => {
    const { rows } = await pool.query(
      `UPDATE notifications SET read = TRUE, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [notificationId]
    );

    return rows[0] ? mapRow(rows[0]) : null;
  },

  markAllAsRead: async (userId) => {
    const { rows } = await pool.query(
      `UPDATE notifications SET read = TRUE, updated_at = NOW()
       WHERE user_id = $1 RETURNING *`,
      [userId]
    );

    return rows.map(mapRow);
  },

  delete: async (notificationId) => {
    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [notificationId]
    );

    return rowCount > 0;
  },

  findById: async (notificationId) => {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [notificationId]
    );

    return rows[0] ? mapRow(rows[0]) : null;
  },
};

module.exports = Notification;
