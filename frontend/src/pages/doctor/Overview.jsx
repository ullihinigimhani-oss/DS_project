import StatusPill from '../../components/StatusPill'
import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function DoctorOverviewContent({ onNavigate }) {
  const {
    profile,
    session,
    verification,
    availableSlots,
    documents,
    prescriptions,
    appointmentSummary,
    patientCount,
    overviewCards,
  } = useDoctorPortal()

  const verificationLabel =
    verification?.status === 'approved'
      ? 'Verified'
      : verification?.status === 'rejected'
        ? 'Unverified'
        : 'Pending'

  const verificationTone =
    verification?.status === 'approved'
      ? 'ok'
      : verification?.status === 'rejected'
        ? 'warn'
        : 'pending'

  return (
    <div className="doctor-page-stack">
      <section className="doctor-welcome-panel">
        <h2>Welcome, Dr. {profile?.name || session?.name || 'Doctor'}</h2>
        <p>Here&apos;s a summary of your current doctor workspace and the integrations already live.</p>
      </section>

      <div className="doctor-metric-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="doctor-metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="doctor-content-grid">
        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Workspace status</h3>
            <StatusPill status={verificationTone} label={verificationLabel} />
          </div>
          <div className="doctor-detail-list">
            <div className="doctor-detail-row">
              <span>Available schedule slots</span>
              <strong>{availableSlots.length}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Uploaded documents</span>
              <strong>{documents.length}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Issued prescriptions</span>
              <strong>{prescriptions.length}</strong>
            </div>
          </div>
        </article>

        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Quick actions</h3>
            <span className="doctor-mini-badge">Doctor tools</span>
          </div>
          <div className="doctor-chip-row">
            <button type="button" className="doctor-chip" onClick={() => onNavigate('/doctor/appointments')}>
              Review appointments
            </button>
            <button type="button" className="doctor-chip" onClick={() => onNavigate('/doctor/schedule')}>
              Update schedule
            </button>
            <button type="button" className="doctor-chip" onClick={() => onNavigate('/doctor/verification')}>
              View verification status
            </button>
            <button type="button" className="doctor-chip" onClick={() => onNavigate('/doctor/prescriptions')}>
              Issue prescription
            </button>
          </div>
        </article>
      </div>

      <div className="doctor-content-grid">
        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Care flow snapshot</h3>
            <span className="doctor-mini-badge">{appointmentSummary.pending} pending</span>
          </div>
          <div className="doctor-detail-list">
            <div className="doctor-detail-row">
              <span>Pending appointment requests</span>
              <strong>{appointmentSummary.pending}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Confirmed telemedicine sessions</span>
              <strong>{appointmentSummary.telemedicine}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Tracked patients</span>
              <strong>{patientCount}</strong>
            </div>
          </div>
        </article>

        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Navigation plan</h3>
            <span className="doctor-mini-badge">Separate pages</span>
          </div>
          <p>
            Each doctor module now lives on its own route, so appointments, schedule, verification,
            prescriptions, and profile work as separate pages instead of a single hardcoded screen.
          </p>
        </article>
      </div>
    </div>
  )
}

export default function Overview(props) {
  return (
    <DoctorPortalPage {...props}>
      <DoctorOverviewContent onNavigate={props.onNavigate} />
    </DoctorPortalPage>
  )
}
