const { pool } = require('../config/postgres');

const mapRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  type: row.type,
  priority: row.priority || 'normal',
  title: row.title,
  message: row.message,
  read: row.read,
  data: row.data || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function buildFilterQuery(filters = {}, options = {}) {
  const values = [];
  const clauses = [];
  const applyUserFilter = options.applyUserFilter !== false;

  if (applyUserFilter) {
    values.push(String(filters.userId));
    clauses.push(`user_id = $${values.length}`);
  }

  if (filters.role && filters.role !== 'all') {
    values.push(String(filters.role));
    clauses.push(`role = $${values.length}`);
  }

  if (filters.type && filters.type !== 'all') {
    values.push(String(filters.type));
    clauses.push(`type = $${values.length}`);
  }

  if (filters.read === true || filters.read === false) {
    values.push(filters.read);
    clauses.push(`read = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${String(filters.search).trim()}%`);
    clauses.push(`(title ILIKE $${values.length} OR message ILIKE $${values.length})`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { values, whereClause };
}

const Notification = {
  create: async (notificationData) => {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, role, type, priority, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        notificationData.userId,
        notificationData.role || null,
        notificationData.type,
        notificationData.priority || 'normal',
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {}),
      ]
    );

    return mapRow(rows[0]);
  },

  findByUserId: async (userId, filters = {}) => {
    const { whereClause, values } = buildFilterQuery({ ...filters, userId });
    const nextValues = [...values];
    let limitClause = '';

    if (filters.limit) {
      nextValues.push(Number(filters.limit));
      limitClause = ` LIMIT $${nextValues.length}`;
    }

    const { rows } = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC${limitClause}`,
      nextValues
    );

    return rows.map(mapRow);
  },

  countByUserId: async (userId, filters = {}) => {
    const { whereClause, values } = buildFilterQuery({ ...filters, userId });
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications ${whereClause}`,
      values
    );

    return parseInt(rows[0].count, 10);
  },

  findAll: async (filters = {}) => {
    const { whereClause, values } = buildFilterQuery(filters, { applyUserFilter: false });
    const nextValues = [...values];
    let limitClause = '';

    if (filters.limit) {
      nextValues.push(Number(filters.limit));
      limitClause = ` LIMIT $${nextValues.length}`;
    }

    const { rows } = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC${limitClause}`,
      nextValues
    );

    return rows.map(mapRow);
  },

  countAll: async (filters = {}) => {
    const { whereClause, values } = buildFilterQuery(filters, { applyUserFilter: false });
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications ${whereClause}`,
      values
    );

    return parseInt(rows[0].count, 10);
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
