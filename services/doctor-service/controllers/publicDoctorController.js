const db = require('../config/postgres');

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

// GET /api/v1/public/doctors
// Lists all doctors with approved verification status
exports.listDoctors = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
          vs.doctor_id,
          COALESCE(dp.name, 'Doctor') AS name,
          COALESCE(dp.specialization, 'General Practice') AS specialization,
          dp.consultation_fee,
          dp.bio,
          vs.approved_at
      FROM verification_status vs
      LEFT JOIN doctor_profiles dp ON dp.doctor_id = vs.doctor_id
      WHERE vs.status = 'approved'
      ORDER BY dp.name ASC NULLS LAST, vs.approved_at DESC
    `);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/public/doctors/:doctorId/slots
// Returns the doctor's available slots for the given week
exports.getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const weekStart = req.query.weekStart || toDateStr(getMonday(new Date()));

    const schedResult = await db.query('SELECT * FROM doctor_schedules WHERE doctor_id = $1', [
      doctorId,
    ]);

    if (!schedResult.rows[0]) {
      return res.status(200).json({ success: true, data: { slots: [], scheduleType: null } });
    }

    const schedule = schedResult.rows[0];
    let slotsResult;

    if (schedule.schedule_type === 'reset') {
      slotsResult = await db.query(
        `SELECT * FROM doctor_schedule_slots
         WHERE schedule_id = $1 AND week_start = $2 AND is_available = TRUE
         ORDER BY day_of_week, start_time`,
        [schedule.id, weekStart]
      );
    } else {
      slotsResult = await db.query(
        `SELECT * FROM doctor_schedule_slots
         WHERE schedule_id = $1 AND week_start IS NULL AND is_available = TRUE
         ORDER BY day_of_week, start_time`,
        [schedule.id]
      );
    }

    res.status(200).json({
      success: true,
      data: {
        scheduleType: schedule.schedule_type,
        weekStart,
        slots: slotsResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/profile
// Authenticated doctor updates their own public profile
exports.updateProfile = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { name, specialization, consultationFee, bio } = req.body;

    const result = await db.query(
      `INSERT INTO doctor_profiles (doctor_id, name, specialization, consultation_fee, bio)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (doctor_id) DO UPDATE
         SET name = COALESCE(EXCLUDED.name, doctor_profiles.name),
             specialization = COALESCE(EXCLUDED.specialization, doctor_profiles.specialization),
             consultation_fee = COALESCE(EXCLUDED.consultation_fee, doctor_profiles.consultation_fee),
             bio = COALESCE(EXCLUDED.bio, doctor_profiles.bio),
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, name || null, specialization || null, consultationFee || null, bio || null]
    );

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/profile
// Authenticated doctor gets their own profile
exports.getProfile = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const result = await db.query('SELECT * FROM doctor_profiles WHERE doctor_id = $1', [
      doctorId,
    ]);

    res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
