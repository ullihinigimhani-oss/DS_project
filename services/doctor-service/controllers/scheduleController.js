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

async function getOrCreateSchedule(doctorId, type = 'recurring') {
  let result = await db.query('SELECT * FROM doctor_schedules WHERE doctor_id = $1', [doctorId]);

  if (!result.rows[0]) {
    result = await db.query(
      'INSERT INTO doctor_schedules (doctor_id, schedule_type) VALUES ($1, $2) RETURNING *',
      [doctorId, type]
    );
  }

  return result.rows[0];
}

// GET /api/v1/schedule
exports.getSchedule = async (req, res) => {
  try {
    const doctorId = req.user.userId;

    const schedResult = await db.query('SELECT * FROM doctor_schedules WHERE doctor_id = $1', [
      doctorId,
    ]);

    if (!schedResult.rows[0]) {
      return res.status(200).json({ success: true, data: null });
    }

    const schedule = schedResult.rows[0];
    let slotsResult;

    if (schedule.schedule_type === 'reset') {
      const weekStart = req.query.weekStart || toDateStr(getMonday(new Date()));
      slotsResult = await db.query(
        `SELECT * FROM doctor_schedule_slots
         WHERE schedule_id = $1 AND week_start = $2
         ORDER BY day_of_week, start_time`,
        [schedule.id, weekStart]
      );
    } else {
      slotsResult = await db.query(
        `SELECT * FROM doctor_schedule_slots
         WHERE schedule_id = $1 AND week_start IS NULL
         ORDER BY day_of_week, start_time`,
        [schedule.id]
      );
    }

    return res.status(200).json({
      success: true,
      data: { ...schedule, slots: slotsResult.rows },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/schedule/type
exports.setScheduleType = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { scheduleType } = req.body;

    if (!['recurring', 'reset'].includes(scheduleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule type. Must be recurring or reset.',
      });
    }

    const result = await db.query(
      `INSERT INTO doctor_schedules (doctor_id, schedule_type)
       VALUES ($1, $2)
       ON CONFLICT (doctor_id) DO UPDATE
         SET schedule_type = EXCLUDED.schedule_type,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, scheduleType]
    );

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/schedule/slots
exports.addSlot = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { dayOfWeek, startTime, endTime, weekStart } = req.body;

    if (dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'dayOfWeek, startTime and endTime are required',
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'startTime must be before endTime' });
    }

    const schedule = await getOrCreateSchedule(doctorId);
    const slotWeekStart =
      schedule.schedule_type === 'reset' ? weekStart || toDateStr(getMonday(new Date())) : null;

    const slotResult = await db.query(
      `INSERT INTO doctor_schedule_slots
          (schedule_id, doctor_id, day_of_week, start_time, end_time, week_start)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [schedule.id, doctorId, dayOfWeek, startTime, endTime, slotWeekStart]
    );

    res.status(201).json({ success: true, data: slotResult.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/schedule/slots/:slotId/availability
exports.toggleSlotAvailability = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { slotId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({ success: false, message: 'isAvailable is required' });
    }

    const result = await db.query(
      `UPDATE doctor_schedule_slots
       SET is_available = $1
       WHERE id = $2 AND doctor_id = $3
       RETURNING *`,
      [isAvailable, slotId, doctorId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/schedule/slots/:slotId
exports.deleteSlot = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { slotId } = req.params;

    const result = await db.query(
      'DELETE FROM doctor_schedule_slots WHERE id = $1 AND doctor_id = $2 RETURNING id',
      [slotId, doctorId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.status(200).json({ success: true, message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/schedule/reset-week
exports.resetWeek = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { weekStart } = req.body;

    if (!weekStart) {
      return res.status(400).json({ success: false, message: 'weekStart is required' });
    }

    const schedResult = await db.query('SELECT * FROM doctor_schedules WHERE doctor_id = $1', [
      doctorId,
    ]);

    if (!schedResult.rows[0] || schedResult.rows[0].schedule_type !== 'reset') {
      return res.status(400).json({ success: false, message: 'No reset-type schedule found' });
    }

    await db.query('DELETE FROM doctor_schedule_slots WHERE doctor_id = $1 AND week_start = $2', [
      doctorId,
      weekStart,
    ]);

    res.status(200).json({ success: true, message: 'Week slots cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
