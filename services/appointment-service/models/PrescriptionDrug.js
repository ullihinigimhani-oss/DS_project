const { query } = require('../config/postgres');

class PrescriptionDrug {
    // Create new prescription drug
    static async create(drugData) {
        const {
            prescription_id,
            rxcui,
            drug_name,
            strength,
            dosage_form,
            frequency,
            duration,
            instructions
        } = drugData;

        const result = await query(
            `INSERT INTO prescription_drugs (prescription_id, rxcui, drug_name, strength, dosage_form, frequency, duration, instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                prescription_id,
                rxcui || null,
                drug_name,
                strength || null,
                dosage_form || null,
                frequency,
                duration,
                instructions || null
            ]
        );
        return result.rows[0];
    }

    // Create multiple drugs for a prescription
    static async createBatch(prescriptionId, drugs) {
        const insertedDrugs = [];
        for (const drug of drugs) {
            const drugData = {
                prescription_id: prescriptionId,
                rxcui: drug.rxcui || null,
                drug_name: drug.drugName,
                strength: drug.strength || null,
                dosage_form: drug.dosageForm || null,
                frequency: drug.frequency,
                duration: drug.duration,
                instructions: drug.instructions || null
            };
            const result = await this.create(drugData);
            insertedDrugs.push(result);
        }
        return insertedDrugs;
    }

    // Delete all drugs for a prescription
    static async deleteByPrescriptionId(prescriptionId) {
        const result = await query(
            'DELETE FROM prescription_drugs WHERE prescription_id = $1',
            [prescriptionId]
        );
        return result.rowCount;
    }

    // Get drugs by prescription ID
    static async findByPrescriptionId(prescriptionId) {
        const result = await query(
            `SELECT * FROM prescription_drugs 
             WHERE prescription_id = $1 
             ORDER BY created_at`,
            [prescriptionId]
        );
        return result.rows;
    }

    // Find drug by ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM prescription_drugs WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    // Update drug
    static async update(id, updateData) {
        const {
            rxcui,
            drug_name,
            strength,
            dosage_form,
            frequency,
            duration,
            instructions
        } = updateData;

        const result = await query(
            `UPDATE prescription_drugs
             SET rxcui = $1, drug_name = $2, strength = $3, dosage_form = $4, 
                 frequency = $5, duration = $6, instructions = $7
             WHERE id = $8
             RETURNING *`,
            [
                rxcui || null,
                drug_name,
                strength || null,
                dosage_form || null,
                frequency,
                duration,
                instructions || null,
                id
            ]
        );
        return result.rows[0];
    }

    // Delete drug by ID
    static async delete(id) {
        const result = await query(
            'DELETE FROM prescription_drugs WHERE id = $1',
            [id]
        );
        return result.rowCount > 0;
    }
}

module.exports = PrescriptionDrug;
