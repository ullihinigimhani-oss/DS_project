const schedule = require('node-schedule');
const db = require('../config/postgres');
const { sendAppointmentEvent } = require('../config/kafka');

/**
 * Queries appointments starting in the next 24–25 hours and publishes
 * APPOINTMENT_REMINDER events so the notification-service can send SMS.
 *
 * Runs every hour at minute 0 (e.g. 09:00, 10:00, ...).
 */
const runReminderJob = async () => {
    try {
        console.log('[ReminderScheduler] Checking for upcoming appointments...');

        // Find appointments that start between 23h and 25h from now
        const result = await db.query(
            `SELECT id, patient_id, doctor_id, patient_name, patient_phone,
                    doctor_name, appointment_date, start_time, status
             FROM appointments
             WHERE status IN ('pending', 'confirmed')
               AND (appointment_date + start_time::interval)
                   BETWEEN (NOW() + INTERVAL '23 hours') AND (NOW() + INTERVAL '25 hours')`,
            []
        );

        console.log(`[ReminderScheduler] Found ${result.rows.length} appointment(s) to remind.`);

        for (const appt of result.rows) {
            await sendAppointmentEvent('APPOINTMENT_REMINDER', {
                appointmentId: appt.id,
                patientId: appt.patient_id,
                doctorId: appt.doctor_id,
                patientName: appt.patient_name,
                patientPhone: appt.patient_phone,
                doctorName: appt.doctor_name,
                appointmentDate: appt.appointment_date,
                startTime: appt.start_time,
                status: appt.status,
            });
        }
    } catch (error) {
        console.error('[ReminderScheduler] Error running reminder job:', error.message);
    }
};

/**
 * Starts the cron scheduler. Call once on service startup.
 * Schedule: every hour at minute 0.
 */
const startReminderScheduler = () => {
    console.log('[ReminderScheduler] Starting appointment reminder scheduler (every hour).');
    schedule.scheduleJob('0 * * * *', runReminderJob);
};

module.exports = { startReminderScheduler };
