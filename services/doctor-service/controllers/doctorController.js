const db = require('../config/postgres');

const getDoctors = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dp.*, vs.status AS verification_status
       FROM doctor_profiles dp
       LEFT JOIN verification_status vs ON vs.doctor_id = dp.doctor_id
       ORDER BY dp.name ASC`
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dp.*, vs.status AS verification_status
       FROM doctor_profiles dp
       LEFT JOIN verification_status vs ON vs.doctor_id = dp.doctor_id
       WHERE dp.doctor_id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createDoctor = async (req, res) => {
  try {
    const { doctorId, name, specialization, consultationFee, bio } = req.body;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required' });
    }

    const result = await db.query(
      `INSERT INTO doctor_profiles (doctor_id, name, specialization, consultation_fee, bio)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (doctor_id) DO UPDATE
         SET name = EXCLUDED.name,
             specialization = EXCLUDED.specialization,
             consultation_fee = EXCLUDED.consultation_fee,
             bio = EXCLUDED.bio,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, name || null, specialization || null, consultationFee || null, bio || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const { name, specialization, consultationFee, bio } = req.body;
    const result = await db.query(
      `UPDATE doctor_profiles
       SET name = COALESCE($1, name),
           specialization = COALESCE($2, specialization),
           consultation_fee = COALESCE($3, consultation_fee),
           bio = COALESCE($4, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE doctor_id = $5
       RETURNING *`,
      [name || null, specialization || null, consultationFee || null, bio || null, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM doctor_profiles WHERE doctor_id = $1 RETURNING doctor_id`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, message: `Doctor ${req.params.id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDoctorSchedule = async (req, res) => {
  try {
    const schedResult = await db.query(
      `SELECT ds.id, ds.doctor_id, ds.schedule_type,
              json_agg(
                json_build_object(
                  'id', dss.id,
                  'day_of_week', dss.day_of_week,
                  'start_time', dss.start_time,
                  'end_time', dss.end_time,
                  'is_available', dss.is_available,
                  'week_start', dss.week_start
                ) ORDER BY dss.day_of_week, dss.start_time
              ) FILTER (WHERE dss.id IS NOT NULL) AS slots
       FROM doctor_schedules ds
       LEFT JOIN doctor_schedule_slots dss ON dss.schedule_id = ds.id
       WHERE ds.doctor_id = $1
       GROUP BY ds.id`,
      [req.params.id]
    );

    res.status(200).json({
      success: true,
      data: schedResult.rows[0] || { doctor_id: req.params.id, slots: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorSchedule,
};
