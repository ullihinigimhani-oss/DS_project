import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function PrescriptionsContent() {
  const {
    prescriptions,
    prescriptionValues,
    handlePrescriptionChange,
    handleIssuePrescription,
  } = useDoctorPortal()

  return (
    <div className="doctor-content-grid">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Issue Prescription</h3>
          <span className="doctor-mini-badge">Prescriptions</span>
        </div>
        <form className="analysis-form" onSubmit={handleIssuePrescription}>
          <label>
            Patient ID
            <input name="patientId" value={prescriptionValues.patientId} onChange={handlePrescriptionChange} />
          </label>
          <label>
            Appointment ID
            <input
              name="appointmentId"
              value={prescriptionValues.appointmentId}
              onChange={handlePrescriptionChange}
            />
          </label>
          <label>
            Patient name
            <input name="patientName" value={prescriptionValues.patientName} onChange={handlePrescriptionChange} />
          </label>
          <label>
            Medications
            <textarea
              name="medications"
              rows="4"
              placeholder="One medication per line"
              value={prescriptionValues.medications}
              onChange={handlePrescriptionChange}
            />
          </label>
          <label>
            Notes
            <textarea name="notes" rows="3" value={prescriptionValues.notes} onChange={handlePrescriptionChange} />
          </label>
          <div className="doctor-toolbar">
            <button type="submit">Issue prescription</button>
          </div>
        </form>
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Issued Prescriptions</h3>
          <span className="doctor-mini-badge">{prescriptions.length} records</span>
        </div>
        <div className="doctor-list-stack">
          {prescriptions.length ? (
            prescriptions.map((prescription) => (
              <article key={prescription.id} className="doctor-list-card">
                <strong>{prescription.patient_name || prescription.patient_id}</strong>
                <p>{new Date(prescription.created_at).toLocaleString()}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No prescriptions issued yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Prescriptions(props) {
  return (
    <DoctorPortalPage {...props}>
      <PrescriptionsContent />
    </DoctorPortalPage>
  )
}
