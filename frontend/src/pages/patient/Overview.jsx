import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function OverviewContent({ onNavigate }) {
  const {
    session,
    isConnectedPatient,
    topCondition,
    gatewayHealth,
    bookingSummary,
    patientMetrics,
  } = usePatientPortal()

  return (
    <div className="patient-page-stack">
      <section className="patient-welcome-panel">
        <h2>Welcome back, {session?.name || 'Patient'}</h2>
        <p>
          Your dashboard keeps booking, symptom guidance, and doctor discovery in one calm care
          workspace.
        </p>
      </section>

      <div className="patient-metric-grid">
        {patientMetrics.map((card) => (
          <article key={card.label} className="patient-metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="patient-content-grid">
        <article className="patient-surface-card">
          <div className="patient-card-topline">
            <h3>Care readiness</h3>
            <StatusPill
              status={bookingSummary.pending ? 'pending' : 'ok'}
              label={bookingSummary.pending ? 'Action needed' : 'On track'}
            />
          </div>
          <div className="patient-detail-list">
            <div className="patient-detail-row">
              <span>Connected mode</span>
              <strong>{isConnectedPatient ? 'Connected patient' : 'Preview patient'}</strong>
            </div>
            <div className="patient-detail-row">
              <span>Recommended focus</span>
              <strong>{topCondition?.name || 'Book a doctor visit'}</strong>
            </div>
            <div className="patient-detail-row">
              <span>Gateway health</span>
              <strong>{gatewayHealth?.status || 'Checking'}</strong>
            </div>
          </div>
        </article>

        <article className="patient-surface-card">
          <div className="patient-card-topline">
            <h3>Quick actions</h3>
            <span className="patient-mini-badge">Care tools</span>
          </div>
          <div className="patient-chip-row">
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => onNavigate('/patient/book-appointment')}
            >
              Book appointment
            </button>
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => onNavigate('/patient/my-bookings')}
            >
              Review bookings
            </button>
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => onNavigate('/patient/doctors')}
            >
              Browse doctors
            </button>
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => onNavigate('/patient/ai-symptoms')}
            >
              Run symptom check
            </button>
          </div>
        </article>
      </div>
    </div>
  )
}

export default function Overview(props) {
  return (
    <PatientPortalPage {...props}>
      <OverviewContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
