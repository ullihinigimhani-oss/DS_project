export default function PatientDashboard({
  activeRole,
  session,
  history,
  doctorDirectory,
  gatewayHealth,
  topCondition,
}) {
  if (activeRole !== 'patient') {
    return (
      <div className="patient-dashboard patient-dashboard-placeholder">
        <strong>Patient dashboard preview is waiting for the patient role.</strong>
        <p>
          Switch the preview role to <strong>patient</strong> from the login page to see the
          patient-specific workspace with care insights, doctor suggestions, and symptom follow-up.
        </p>
      </div>
    )
  }

  const recentHistory = history.slice(0, 3)
  const featuredDoctors = doctorDirectory.slice(0, 3)

  const overviewCards = [
    {
      label: 'Care mode',
      value: session?.mode === 'connected' ? 'Connected patient' : 'Preview patient',
      detail: session?.email || 'patient@example.com',
    },
    {
      label: 'Symptom check-ins',
      value: String(history.length),
      detail: history.length ? 'Saved AI-supported check-ins' : 'No saved check-ins yet',
    },
    {
      label: 'Recommended focus',
      value: topCondition?.name || 'Start an AI triage',
      detail: topCondition
        ? `${topCondition.confidencePercent}% confidence on the latest analysis`
        : 'Describe symptoms to get your first recommendation',
    },
    {
      label: 'Gateway status',
      value: gatewayHealth?.status || 'Checking',
      detail: gatewayHealth?.service || 'api-gateway',
    },
  ]

  return (
    <div className="patient-dashboard">
      <div className="patient-overview-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="patient-overview-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="patient-journey-grid">
        <div className="patient-journey-card">
          <div className="journey-card-header">
            <h3>Care actions</h3>
            <span className="dashboard-badge">Live now</span>
          </div>
          <div className="action-chip-row">
            <span className="action-chip">Run symptom analysis</span>
            <span className="action-chip">Review saved history</span>
            <span className="action-chip">Browse doctors</span>
          </div>
          <p>
            This patient dashboard is organized around the parts already connected today, so the
            live workflow feels intentional even before appointments and records are fully wired in.
          </p>
        </div>

        <div className="patient-journey-card">
          <div className="journey-card-header">
            <h3>Next likely step</h3>
            <span className="dashboard-badge muted">Guidance</span>
          </div>
          <p className="patient-callout">
            {topCondition
              ? `Your latest symptom analysis points toward ${topCondition.name}. Review the doctor list below if you want to turn that triage result into a consult flow next.`
              : 'Start with the symptom analyzer route, then use the doctor directory to move from triage into care discovery.'}
          </p>
        </div>
      </div>

      <div className="patient-journey-grid">
        <div className="patient-journey-card">
          <div className="journey-card-header">
            <h3>Recent symptom activity</h3>
            <span className="dashboard-badge">{history.length} saved</span>
          </div>
          {recentHistory.length ? (
            <div className="dashboard-list">
              {recentHistory.map((item) => (
                <article key={item.id} className="dashboard-list-item">
                  <strong>{new Date(item.analyzed_at).toLocaleDateString()}</strong>
                  <p>{item.symptoms}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No patient activity yet. Run a symptom check to start the journey.</p>
          )}
        </div>

        <div className="patient-journey-card">
          <div className="journey-card-header">
            <h3>Doctor suggestions</h3>
            <span className="dashboard-badge">{doctorDirectory.length} listed</span>
          </div>
          {featuredDoctors.length ? (
            <div className="dashboard-list">
              {featuredDoctors.map((doctor) => (
                <article key={doctor.doctor_id} className="dashboard-list-item">
                  <strong>{doctor.name || 'Doctor'}</strong>
                  <p>{doctor.specialization || 'General Practice'}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Doctor profiles will appear here as soon as the directory responds.</p>
          )}
        </div>
      </div>
    </div>
  )
}
