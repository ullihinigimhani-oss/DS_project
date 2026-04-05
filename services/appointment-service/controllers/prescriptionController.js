const { query } = require('../config/postgres');

// POST /api/v1/prescriptions
// Doctor creates a prescription for a confirmed appointment
const createPrescription = async (req, res) => {
    const doctorId = req.user.userId;
    const { appointmentId, diagnosis, notes, drugs } = req.body;

    if (!appointmentId || !diagnosis || !Array.isArray(drugs) || drugs.length === 0) {
        return res.status(400).json({ success: false, message: 'appointmentId, diagnosis, and at least one drug are required.' });
    }

    // Validate each drug entry
    for (const d of drugs) {
        if (!d.drugName || !d.frequency || !d.duration) {
            return res.status(400).json({ success: false, message: 'Each drug must have drugName, frequency, and duration.' });
        }
    }

    try {
        // Verify the appointment belongs to this doctor and is confirmed
        const apptRes = await query(
            `SELECT id, patient_id, doctor_id, doctor_name, patient_name, status
             FROM appointments
             WHERE id = $1 AND doctor_id = $2`,
            [appointmentId, doctorId]
        );

        if (apptRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found or not assigned to you.' });
        }

        const appt = apptRes.rows[0];
        if (appt.status !== 'confirmed') {
            return res.status(400).json({ success: false, message: `Cannot prescribe for a ${appt.status} appointment. Only confirmed appointments are allowed.` });
        }

        // Check if a prescription already exists for this appointment
        const existingRes = await query(
            `SELECT id FROM prescriptions WHERE appointment_id = $1`,
            [appointmentId]
        );
        if (existingRes.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'A prescription already exists for this appointment. Update it instead.' });
        }

        // Insert prescription
        const prescRes = await query(
            `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, doctor_name, patient_name, diagnosis, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [appointmentId, doctorId, appt.patient_id, appt.doctor_name, appt.patient_name, diagnosis, notes || null]
        );
        const prescription = prescRes.rows[0];

        // Insert drugs
        const insertedDrugs = [];
        for (const d of drugs) {
            const drugRes = await query(
                `INSERT INTO prescription_drugs (prescription_id, rxcui, drug_name, strength, dosage_form, frequency, duration, instructions)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    prescription.id,
                    d.rxcui || null,
                    d.drugName,
                    d.strength || null,
                    d.dosageForm || null,
                    d.frequency,
                    d.duration,
                    d.instructions || null,
                ]
            );
            insertedDrugs.push(drugRes.rows[0]);
        }

        return res.status(201).json({
            success: true,
            data: { ...prescription, drugs: insertedDrugs },
        });
    } catch (err) {
        console.error('createPrescription error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/v1/prescriptions/:id
// Doctor updates an existing prescription (replaces drugs list)
const updatePrescription = async (req, res) => {
    const doctorId = req.user.userId;
    const { id } = req.params;
    const { diagnosis, notes, drugs } = req.body;

    if (!diagnosis || !Array.isArray(drugs) || drugs.length === 0) {
        return res.status(400).json({ success: false, message: 'diagnosis and at least one drug are required.' });
    }

    for (const d of drugs) {
        if (!d.drugName || !d.frequency || !d.duration) {
            return res.status(400).json({ success: false, message: 'Each drug must have drugName, frequency, and duration.' });
        }
    }

    try {
        const prescRes = await query(
            `SELECT p.*, a.status AS appt_status
             FROM prescriptions p
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.id = $1 AND p.doctor_id = $2`,
            [id, doctorId]
        );

        if (prescRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found.' });
        }

        // Update prescription
        const updatedRes = await query(
            `UPDATE prescriptions
             SET diagnosis = $1, notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [diagnosis, notes || null, id]
        );

        // Replace drugs: delete old, insert new
        await query(`DELETE FROM prescription_drugs WHERE prescription_id = $1`, [id]);

        const insertedDrugs = [];
        for (const d of drugs) {
            const drugRes = await query(
                `INSERT INTO prescription_drugs (prescription_id, rxcui, drug_name, strength, dosage_form, frequency, duration, instructions)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    id,
                    d.rxcui || null,
                    d.drugName,
                    d.strength || null,
                    d.dosageForm || null,
                    d.frequency,
                    d.duration,
                    d.instructions || null,
                ]
            );
            insertedDrugs.push(drugRes.rows[0]);
        }

        return res.json({
            success: true,
            data: { ...updatedRes.rows[0], drugs: insertedDrugs },
        });
    } catch (err) {
        console.error('updatePrescription error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/v1/prescriptions/doctor  — all prescriptions by this doctor
const getDoctorPrescriptions = async (req, res) => {
    const doctorId = req.user.userId;
    try {
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
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('getDoctorPrescriptions error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/v1/prescriptions/patient  — all prescriptions for the authenticated patient
const getPatientPrescriptions = async (req, res) => {
    // Support both JWT-authenticated requests and internal service-to-service calls
    const patientId = (req.user && req.user.userId) || req.params.patientId;
    if (!patientId) {
        return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }
    try {
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
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('getPatientPrescriptions error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/v1/prescriptions/appointment/:appointmentId
// Fetch prescription for a specific appointment (doctor or patient)
const getPrescriptionByAppointment = async (req, res) => {
    const userId = req.user.userId;
    const { appointmentId } = req.params;
    try {
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
             WHERE p.appointment_id = $1
               AND (p.doctor_id = $2 OR p.patient_id = $2)
             GROUP BY p.id, a.appointment_date, a.start_time, a.end_time`,
            [appointmentId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No prescription found for this appointment.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getPrescriptionByAppointment error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/v1/prescriptions/:id  — single prescription
const getPrescriptionById = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
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
             WHERE p.id = $1
               AND (p.doctor_id = $2 OR p.patient_id = $2)
             GROUP BY p.id, a.appointment_date, a.start_time, a.end_time`,
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getPrescriptionById error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    createPrescription,
    updatePrescription,
    getDoctorPrescriptions,
    getPatientPrescriptions,
    getPrescriptionByAppointment,
    getPrescriptionById,
};
