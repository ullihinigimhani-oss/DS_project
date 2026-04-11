import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function DoctorsContent({ onNavigate }) {
  const { doctorDirectory, handleDoctorSelect } = usePatientPortal()

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Doctor directory</h3>
          <span className="patient-mini-badge">{doctorDirectory.length} listed</span>
        </div>

        <div className="patient-directory-grid">
          {doctorDirectory.map((doctor) => (
            <article key={doctor.doctor_id} className="patient-directory-card">
              <div className="patient-directory-topline">
                <StatusPill
                  status={doctor.verification_status === 'approved' ? 'ok' : 'warn'}
                  label={
                    doctor.verification_status === 'approved' ? 'Verified Doctor' : 'Unverified'
                  }
                />
                <span>{doctor.specialization || 'General Practice'}</span>
              </div>
              <strong>{doctor.name || 'Doctor'}</strong>
              <p>Consultation fee: {doctor.consultation_fee ?? 'N/A'}</p>
              <button
                type="button"
                disabled={doctor.verification_status !== 'approved'}
                onClick={() => {
                  handleDoctorSelect(doctor.doctor_id)
                  onNavigate('/patient/book-appointment')
                }}
              >
                {doctor.verification_status === 'approved'
                  ? 'Choose doctor'
                  : 'Awaiting verification'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function Doctors(props) {
  return (
    <PatientPortalPage {...props}>
      <DoctorsContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
