const db = require('../config/postgres');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Create a new user
   */
  static async create(userData) {
    const { email, password, name, phone, userType = 'patient' } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password, name, phone, user_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, phone, user_type, created_at
    `;

    try {
      const result = await db.query(query, [email, hashedPassword, name, phone, userType]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }

      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    if (!email) return null;
    const query = 'SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by id
   */
  static async findById(id) {
    const query = `
      SELECT id, email, name, phone, birthdate, address, emergency_contact, emergency_contact_name, emergency_contact_number, weight, gender, blood_type, allergies, last_visit_date, user_type, is_active, created_at
      FROM users
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, userData) {
    const { name, phone, birthdate, address, emergency_contact_name, emergency_contact_number, weight, gender, blood_type, allergies, last_visit_date } = userData;

    const query = `
      UPDATE users
      SET name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          birthdate = COALESCE($4, birthdate),
          address = COALESCE($5, address),
          emergency_contact_name = COALESCE($6, emergency_contact_name),
          emergency_contact_number = COALESCE($7, emergency_contact_number),
          weight = COALESCE($8, weight),
          gender = COALESCE($9, gender),
          blood_type = COALESCE($10, blood_type),
          allergies = COALESCE($11, allergies),
          last_visit_date = COALESCE($12, last_visit_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, phone, birthdate, address, emergency_contact_name, emergency_contact_number, weight, gender, blood_type, allergies, last_visit_date, user_type, updated_at
    `;

    const result = await db.query(query, [id, name, phone, birthdate, address, emergency_contact_name, emergency_contact_number, weight, gender, blood_type, allergies, last_visit_date]);
    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Check if user exists
   */
  static async exists(email) {
    const query = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  }

  /**
   * Delete user (soft delete)
   */
  static async deactivate(id) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all users (with pagination)
   */
  static async findAll(limit = 10, offset = 0) {
    const query = `
      SELECT id, email, name, phone, user_type, is_active, created_at
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get all users with search, filter and pagination (admin)
   */
  static async findAllWithFilters({ search = '', role = '', status = '', limit = 10, offset = 0 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (role) {
      conditions.push(`user_type = $${idx}`);
      params.push(role);
      idx++;
    }

    if (status === 'active') {
      conditions.push('is_active = true');
    } else if (status === 'inactive') {
      conditions.push('is_active = false');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM users ${where}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT id, email, name, phone, user_type, is_active, created_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const dataResult = await db.query(dataQuery, [...params, limit, offset]);

    return { users: dataResult.rows, total };
  }

  /**
   * Activate a user
   */
  static async activate(id) {
    const query = `
      UPDATE users
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Admin update user (name, phone, role)
   */
  static async adminUpdate(id, { name, phone, user_type }) {
    const query = `
      UPDATE users
      SET name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          user_type = COALESCE($4, user_type),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, phone, user_type, is_active, created_at, updated_at
    `;
    const result = await db.query(query, [id, name, phone, user_type]);
    return result.rows[0];
  }
}

module.exports = User;
