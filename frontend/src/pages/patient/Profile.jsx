import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function ProfileContent() {
  const {
    isConnectedPatient,
    session,
    isTelemedicine,
    bookingSummary,
    doctorDirectory,
    history,
    gatewayHealth,
  } = usePatientPortal()

  return (
    <div className="patient-content-grid">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Profile</h3>
          <StatusPill
            status={isConnectedPatient ? 'ok' : 'warn'}
            label={isConnectedPatient ? 'Connected' : 'Preview'}
          />
        </div>
        <div className="patient-detail-list">
          <div className="patient-detail-row">
            <span>Name</span>
            <strong>{session?.name || 'Patient'}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Email</span>
            <strong>{session?.email || 'Not available'}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Preferred visit style</span>
            <strong>{isTelemedicine ? 'Telemedicine enabled' : 'Clinic-first'}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Role</span>
            <strong>{session?.role || 'patient'}</strong>
          </div>
        </div>
      </section>

      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Care snapshot</h3>
          <span className="patient-mini-badge">Summary</span>
        </div>
        <div className="patient-detail-list">
          <div className="patient-detail-row">
            <span>Bookings confirmed</span>
            <strong>{bookingSummary.confirmed}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Doctors explored</span>
            <strong>{doctorDirectory.length}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Symptom check-ins</span>
            <strong>{history.length}</strong>
          </div>
          <div className="patient-detail-row">
            <span>Gateway</span>
            <strong>{gatewayHealth?.status || 'Checking'}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Profile(props) {
  return (
    <PatientPortalPage {...props}>
      <ProfileContent />
    </PatientPortalPage>
  )
}
