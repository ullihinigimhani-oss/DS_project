import {
  formatAdminAppointmentDate,
  getAppointmentTone,
  useAdminPortal,
} from './AdminPortalContext'

export default function AdminAppointmentsPage() {
  const {
    appointments,
    appointmentsLoading,
    appointmentStats,
    appointmentStatusFilter,
    appointmentSearch,
    setAppointmentStatusFilter,
    setAppointmentSearch,
    loadAppointments,
  } = useAdminPortal()

  return (
    <div className="admin-page-stack">
      <section className="admin-surface-card">
        <div className="admin-card-topline">
          <div>
            <h3>Appointments monitoring</h3>
            <p>Track platform-wide bookings, filter by status, and inspect activity across doctors and patients.</p>
          </div>
          <span className="dashboard-badge">{appointmentStats.total} total</span>
        </div>

        <div className="admin-filter-grid">
          <label className="doctor-compact-field">
            <span>Status</span>
            <select
              value={appointmentStatusFilter}
              onChange={(event) => setAppointmentStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="doctor-compact-field">
            <span>Search</span>
            <input
              type="search"
              value={appointmentSearch}
              onChange={(event) => setAppointmentSearch(event.target.value)}
              placeholder="Search by doctor, patient, or ID"
            />
          </label>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="secondary-button" onClick={() => void loadAppointments()}>
            Refresh appointments
          </button>
        </div>

        {appointmentsLoading ? <p className="empty-state">Loading appointments...</p> : null}

        {!appointmentsLoading && appointments.length === 0 ? (
          <p className="empty-state">No appointments match the selected filter yet.</p>
        ) : null}

        <div className="admin-appointment-list">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="admin-appointment-card">
              <div className="admin-card-topline">
                <div>
                  <h3>{appointment.patient_name || 'Patient'} with {appointment.doctor_name || 'Doctor'}</h3>
                  <p>{formatAdminAppointmentDate(appointment.appointment_date, appointment.start_time)}</p>
                </div>
                <span className={`status-pill ${getAppointmentTone(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>

              <div className="admin-metadata-grid">
                <div>
                  <span>Patient ID</span>
                  <strong>{appointment.patient_id || 'Not available'}</strong>
                </div>
                <div>
                  <span>Doctor ID</span>
                  <strong>{appointment.doctor_id || 'Not available'}</strong>
                </div>
                <div>
                  <span>Visit type</span>
                  <strong>{appointment.is_telemedicine ? 'Telemedicine' : 'In-person'}</strong>
                </div>
              </div>

              <p className="doctor-help">
                {appointment.reason || 'No consultation reason was provided for this booking.'}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
