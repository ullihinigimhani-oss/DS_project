const { query } = require('../config/postgres');

class Prescription {
    // Create new prescription
    static async create(prescriptionData) {
        const {
            appointment_id,
            doctor_id,
            patient_id,
            doctor_name,
            patient_name,
            diagnosis,
            notes
        } = prescriptionData;

        const result = await query(
            `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, doctor_name, patient_name, diagnosis, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [appointment_id, doctor_id, patient_id, doctor_name, patient_name, diagnosis, notes || null]
        );
        return result.rows[0];
    }

    // Find prescription by ID
    static async findById(id) {
        const result = await query(
            `SELECT p.*,
                    json_agg(
                        json_build_object(
                            'id', pd.id,
                            'rxcui', pd.rxcui,
                            'drug_name', pd.drug_name,
                            'strength', pd.strength,
                            'dosage_form', pd.dosage_form,
                            'frequency', pd.frequency,
                            'duration', pd.duration,
                            'instructions', pd.instructions
                        ) ORDER BY pd.created_at
                    ) FILTER (WHERE pd.id IS NOT NULL) AS drugs
             FROM prescriptions p
             LEFT JOIN prescription_drugs pd ON pd.prescription_id = p.id
             WHERE p.id = $1
             GROUP BY p.id`,
            [id]
        );
        return result.rows[0];
    }

    // Find prescription by appointment ID
    static async findByAppointmentId(appointmentId) {
        const result = await query(
            `SELECT p.*,
                    json_agg(
                        json_build_object(
                            'id', pd.id,
                            'rxcui', pd.rxcui,
                            'drug_name', pd.drug_name,
                            'strength', pd.strength,
                            'dosage_form', pd.dosage_form,
                            'frequency', pd.frequency,
                            'duration', pd.duration,
                            'instructions', pd.instructions
                        ) ORDER BY pd.created_at
                    ) FILTER (WHERE pd.id IS NOT NULL) AS drugs
             FROM prescriptions p
             LEFT JOIN prescription_drugs pd ON pd.prescription_id = p.id
             WHERE p.appointment_id = $1
             GROUP BY p.id`,
            [appointmentId]
        );
        return result.rows[0];
    }

    // Update prescription
    static async update(id, updateData) {
        const { diagnosis, notes } = updateData;
        const result = await query(
            `UPDATE prescriptions
             SET diagnosis = $1, notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [diagnosis, notes || null, id]
        );
        return result.rows[0];
    }

    // Get prescriptions by doctor ID
    static async findByDoctorId(doctorId) {
        const result = await query(
            `SELECT p.*,
                    json_agg(
                        json_build_object(
                            'id', pd.id,
                            'rxcui', pd.rxcui,
                            'drug_name', pd.drug_name,
                            'strength', pd.strength,
                            'dosage_form', pd.dosage_form,
                            'frequency', pd.frequency,
                            'duration', pd.duration,
                            'instructions', pd.instructions
                        ) ORDER BY pd.created_at
                    ) FILTER (WHERE pd.id IS NOT NULL) AS drugs,
                    a.appointment_date, a.start_time, a.end_time
             FROM prescriptions p
             LEFT JOIN prescription_drugs pd ON pd.prescription_id = p.id
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.doctor_id = $1
             GROUP BY p.id, a.appointment_date, a.start_time, a.end_time
             ORDER BY p.created_at DESC`,
            [doctorId]
        );
        return result.rows;
    }

    // Get prescriptions by patient ID
    static async findByPatientId(patientId) {
        const result = await query(
            `SELECT p.*,
                    json_agg(
                        json_build_object(
                            'id', pd.id,
                            'rxcui', pd.rxcui,
                            'drug_name', pd.drug_name,
                            'strength', pd.strength,
                            'dosage_form', pd.dosage_form,
                            'frequency', pd.frequency,
                            'duration', pd.duration,
                            'instructions', pd.instructions
                        ) ORDER BY pd.created_at
                    ) FILTER (WHERE pd.id IS NOT NULL) AS drugs,
                    a.appointment_date, a.start_time, a.end_time
             FROM prescriptions p
             LEFT JOIN prescription_drugs pd ON pd.prescription_id = p.id
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.patient_id = $1
             GROUP BY p.id, a.appointment_date, a.start_time, a.end_time
             ORDER BY p.created_at DESC`,
            [patientId]
        );
        return result.rows;
    }

    // Check if prescription exists for appointment
    static async existsByAppointmentId(appointmentId) {
        const result = await query(
            'SELECT id FROM prescriptions WHERE appointment_id = $1',
            [appointmentId]
        );
        return result.rows.length > 0;
    }

    // Verify prescription belongs to doctor
    static async verifyDoctorAccess(prescriptionId, doctorId) {
        const result = await query(
            `SELECT p.*, a.status AS appt_status
             FROM prescriptions p
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.id = $1 AND p.doctor_id = $2`,
            [prescriptionId, doctorId]
        );
        return result.rows[0];
    }

    // Verify user access (doctor or patient) to prescription
    static async verifyUserAccess(prescriptionId, userId) {
        const result = await query(
            `SELECT p.*,
                    a.appointment_date, a.start_time, a.end_time
             FROM prescriptions p
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.id = $1
               AND (p.doctor_id = $2 OR p.patient_id = $2)`,
            [prescriptionId, userId]
        );
        return result.rows[0];
    }
}

module.exports = Prescription;
