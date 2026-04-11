import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function PatientsContent() {
  const { patientCount, prescriptions, appointments } = useDoctorPortal()

  const patientRecords = Array.from(
    new Map(
      [...appointments, ...prescriptions]
        .map((item) => {
          const patientId = item.patient_id || item.patient_name
          if (!patientId) return null

          return [
            patientId,
            {
              id: patientId,
              name: item.patient_name || item.patient_id || 'Patient',
              detail:
                item.patient_email || item.patient_phone || item.patient_id || 'Patient record from doctor activity',
            },
          ]
        })
        .filter(Boolean),
    ).values(),
  )

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Patients</h3>
          <span className="doctor-mini-badge">{patientCount} tracked</span>
        </div>
        <p>
          This page collects patients you have met through appointments and prescriptions, so the
          doctor portal has a dedicated patient view instead of mixing it into overview.
        </p>
        <div className="doctor-list-stack">
          {patientRecords.length ? (
            patientRecords.map((patient) => (
              <article key={patient.id} className="doctor-list-card">
                <strong>{patient.name}</strong>
                <p>{patient.detail}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">Patient records will appear here after bookings or prescriptions are created.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Patients(props) {
  return (
    <DoctorPortalPage {...props}>
      <PatientsContent />
    </DoctorPortalPage>
  )
}
