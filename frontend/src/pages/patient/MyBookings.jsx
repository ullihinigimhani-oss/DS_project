import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, getBookingTone, usePatientPortal } from './PatientPortalContext'

function MyBookingsContent() {
  const {
    bookings,
    bookingsLoading,
    bookingSummary,
    isConnectedPatient,
    bookingBusyId,
    handleCancelBooking,
    session,
  } = usePatientPortal()

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>My bookings</h3>
          <span className="patient-mini-badge">{bookings.length} total</span>
        </div>

        <div className="patient-chip-row">
          <span className="patient-chip">{bookingSummary.pending} pending</span>
          <span className="patient-chip">{bookingSummary.confirmed} confirmed</span>
          <span className="patient-chip">{bookingSummary.today} today</span>
        </div>

        {bookingsLoading ? <p className="empty-state">Loading your bookings...</p> : null}

        {!bookingsLoading && bookings.length === 0 ? (
          <p className="empty-state">No bookings yet. Your appointment requests will appear here.</p>
        ) : null}

        <div className="patient-bookings-stack">
          {bookings.map((booking) => (
            <article key={booking.id} className="patient-booking-card">
              <div className="patient-booking-topline">
                <div>
                  <strong>{booking.doctor_name || 'Doctor'}</strong>
                  <p>
                    {formatDate(booking.appointment_date)} | {formatTime(booking.start_time)} -{' '}
                    {formatTime(booking.end_time)}
                  </p>
                </div>
                <StatusPill status={getBookingTone(booking.status)} label={booking.status} />
              </div>
              <p>{booking.reason || 'No reason provided.'}</p>
              <div className="patient-booking-meta">
                <span>{booking.is_telemedicine ? 'Telemedicine' : 'Clinic visit'}</span>
                <span>{booking.patient_name || session?.name || 'Patient'}</span>
              </div>
              {booking.status === 'pending' || booking.status === 'confirmed' ? (
                <div className="patient-booking-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!isConnectedPatient || bookingBusyId === booking.id}
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    {bookingBusyId === booking.id ? 'Cancelling...' : 'Cancel booking'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function MyBookings(props) {
  return (
    <PatientPortalPage {...props}>
      <MyBookingsContent />
    </PatientPortalPage>
  )
}
