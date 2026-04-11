const db = require('../config/postgres');
const { deleteFile, saveFile } = require('../utils/fileStorage');

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

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

// GET /api/v1/public/doctors
// Lists all doctors and exposes whether they are verified for patient-facing pages
exports.listDoctors = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
          dp.doctor_id,
          COALESCE(dp.name, 'Doctor') AS name,
          COALESCE(dp.specialization, 'General Practice') AS specialization,
          dp.consultation_fee,
          dp.profile_image_url,
          dp.bio,
          COALESCE(vs.status, 'pending') AS verification_status,
          vs.approved_at
      FROM doctor_profiles dp
      LEFT JOIN verification_status vs ON vs.doctor_id = dp.doctor_id
      ORDER BY
          CASE WHEN COALESCE(vs.status, 'pending') = 'approved' THEN 0 ELSE 1 END,
          dp.name ASC NULLS LAST,
          vs.approved_at DESC NULLS LAST
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
    const { name, specialization, consultationFee, bio, profileImageData, profileImageName } = req.body;
    let profileImageUrl = null;

    if (profileImageData) {
      const parsedImage = parseDataUrl(profileImageData);

      if (!parsedImage || !parsedImage.mimeType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile image payload',
        });
      }

      const currentProfile = await db.query(
        'SELECT profile_image_url FROM doctor_profiles WHERE doctor_id = $1',
        [doctorId]
      );

      const saveResult = await saveFile(
        parsedImage.buffer,
        profileImageName || `profile-image.${parsedImage.mimeType.split('/')[1] || 'png'}`,
        doctorId
      );

      if (!saveResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save profile image',
          error: saveResult.error,
        });
      }

      if (currentProfile.rows[0]?.profile_image_url) {
        await deleteFile(currentProfile.rows[0].profile_image_url);
      }

      profileImageUrl = saveResult.documentUrl;
    }

    const result = await db.query(
      `INSERT INTO doctor_profiles (doctor_id, name, specialization, consultation_fee, bio, profile_image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (doctor_id) DO UPDATE
         SET name = COALESCE(EXCLUDED.name, doctor_profiles.name),
             specialization = COALESCE(EXCLUDED.specialization, doctor_profiles.specialization),
             consultation_fee = COALESCE(EXCLUDED.consultation_fee, doctor_profiles.consultation_fee),
             bio = COALESCE(EXCLUDED.bio, doctor_profiles.bio),
             profile_image_url = COALESCE(EXCLUDED.profile_image_url, doctor_profiles.profile_image_url),
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        doctorId,
        name || null,
        specialization || null,
        consultationFee || null,
        bio || null,
        profileImageUrl,
      ]
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

// POST /api/v1/public/profile/image
// Authenticated doctor uploads or replaces their profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
    }

    const currentProfile = await db.query(
      'SELECT profile_image_url FROM doctor_profiles WHERE doctor_id = $1',
      [doctorId]
    );

    const saveResult = await saveFile(file.buffer, file.originalname, doctorId);

    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save image',
        error: saveResult.error,
      });
    }

    if (currentProfile.rows[0]?.profile_image_url) {
      await deleteFile(currentProfile.rows[0].profile_image_url);
    }

    const result = await db.query(
      `INSERT INTO doctor_profiles (doctor_id, profile_image_url)
       VALUES ($1, $2)
       ON CONFLICT (doctor_id) DO UPDATE
         SET profile_image_url = EXCLUDED.profile_image_url,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, saveResult.documentUrl]
    );

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error uploading doctor profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: error.message,
    });
  }
};
