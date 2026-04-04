const db = require('../config/postgres');

class AuditLog {
  /**
   * Create a new audit log entry.
   */
  static async create({
    actorId,
    actorEmail,
    actorName,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    status = 'success',
  }) {
    const query = `
      INSERT INTO audit_logs
          (actor_id, actor_email, actor_name, action, resource_type, resource_id, details, ip_address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      actorId || null,
      actorEmail || null,
      actorName || null,
      action,
      resourceType || null,
      resourceId ? String(resourceId) : null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      status,
    ]);

    return result.rows[0];
  }

  /**
   * Query audit logs with filters and pagination.
   * @param {Object} opts - { action, search, from, to, limit, offset }
   */
  static async findAllWithFilters({ action, search, from, to, limit, offset }) {
    const conditions = [];
    const params = [];
    let p = 1;

    if (action) {
      conditions.push(`action = $${p++}`);
      params.push(action);
    }

    if (search) {
      conditions.push(`(actor_email ILIKE $${p} OR actor_name ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }

    if (from) {
      conditions.push(`created_at >= $${p++}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`created_at <= $${p++}`);
      params.push(to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    );

    return { logs: dataResult.rows, total };
  }

  /**
   * Return all distinct action values (for filter dropdowns).
   */
  static async getDistinctActions() {
    const result = await db.query(`SELECT DISTINCT action FROM audit_logs ORDER BY action`);
    return result.rows.map((r) => r.action);
  }
}

module.exports = AuditLog;
