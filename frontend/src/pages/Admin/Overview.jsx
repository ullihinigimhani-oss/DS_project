import { formatAdminAppointmentDate, useAdminPortal } from './AdminPortalContext'

export default function AdminOverviewPage() {
  const {
    overview,
    appointmentMetrics,
    recentAppointments,
    recentUsers,
    pendingVerificationCount,
    loadOverview,
    loadUsers,
    loadVerificationQueue,
    loadAppointments,
  } = useAdminPortal()

  const overviewCards = [
    { label: 'Total users', value: overview.totalUsers, detail: 'All accounts across the platform.' },
    { label: 'Doctors', value: overview.totalDoctors, detail: `${pendingVerificationCount} awaiting review.` },
    { label: 'Patients', value: overview.totalPatients, detail: 'Signed-up patient accounts.' },
    { label: 'Appointments', value: overview.totalAppointments, detail: `${overview.appointmentsThisMonth} active this month.` },
  ]

  return (
    <div className="admin-page-stack">
      <section className="admin-welcome-panel">
        <div>
          <p className="admin-kicker">System overview</p>
          <h2>Platform health at a glance</h2>
          <p>
            This workspace keeps the core operations in one place so we can review account growth,
            manage risk, and clear the doctor verification queue quickly.
          </p>
        </div>
        <div className="admin-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void loadOverview()
              void loadUsers()
              void loadVerificationQueue()
              void loadAppointments()
            }}
          >
            Refresh dashboard
          </button>
        </div>
      </section>

      <section className="admin-metric-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="admin-metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="admin-content-grid">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>Appointment monitoring</h3>
            <span className="dashboard-badge">{overview.totalAppointments} total</span>
          </div>
          <div className="admin-stat-list">
            {appointmentMetrics.map((item) => (
              <div key={item.label} className="admin-stat-list-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>Recent users</h3>
            <span className="dashboard-badge">{recentUsers.length} shown</span>
          </div>
          {recentUsers.length === 0 ? (
            <p className="empty-state">No users available yet.</p>
          ) : (
            <div className="admin-list">
              {recentUsers.map((user) => (
                <div key={user.id} className="admin-list-item">
                  <div>
                    <strong>{user.name || 'User'}</strong>
                    <p>{user.email}</p>
                  </div>
                  <span className={`status-pill ${user.is_active ? 'ok' : 'warn'}`}>
                    {user.user_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="admin-content-grid">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>Pending doctor verification</h3>
            <span className="dashboard-badge muted">{pendingVerificationCount} waiting</span>
          </div>
          <p>
            Approvals here directly affect which doctors become visible and bookable in the patient
            workspace.
          </p>
        </article>

        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>Recent appointments</h3>
            <span className="dashboard-badge">{recentAppointments.length} shown</span>
          </div>
          {recentAppointments.length === 0 ? (
            <p className="empty-state">No appointments found yet.</p>
          ) : (
            <div className="admin-list">
              {recentAppointments.slice(0, 6).map((appointment) => (
                <div key={appointment.id} className="admin-list-item">
                  <div>
                    <strong>{appointment.patient_name || 'Patient'} with {appointment.doctor_name || 'Doctor'}</strong>
                    <p>{formatAdminAppointmentDate(appointment.appointment_date, appointment.start_time)}</p>
                  </div>
                  <span className={`status-pill ${appointment.status === 'confirmed' ? 'ok' : appointment.status === 'pending' ? 'pending' : 'warn'}`}>
                    {appointment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
