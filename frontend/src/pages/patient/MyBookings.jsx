import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'

function readText(value, fallback = 'Not provided') {
  const text = String(value || '').trim()
  return text || fallback
}

function safeFormatDate(value) {
  try {
    return formatDate(value)
  } catch {
    return 'Date pending'
  }
}

function safeFormatTime(value) {
  try {
    return formatTime(value)
  } catch {
    return '--:--'
  }
}

function formatPaymentLabel(status) {
  if (status === 'paid') return 'paid'
  if (status === 'pending') return 'payment pending'
  if (status === 'failed') return 'payment failed'
  return 'unpaid'
}

function BookingCard({ booking, session, isConnectedPatient, bookingBusyId, onCancel, onPay }) {
  const paymentLabel = formatPaymentLabel(booking.payment_status)
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <article className="patient-booking-card">
      <div className="patient-booking-topline">
        <div>
          <strong>{readText(booking.doctor_name, 'Doctor')}</strong>
          <p>
            {readText(safeFormatDate(booking.appointment_date), 'Date pending')} |{' '}
            {readText(safeFormatTime(booking.start_time), '--:--')} -{' '}
            {readText(safeFormatTime(booking.end_time), '--:--')}
          </p>
        </div>
        <StatusPill
          status={paymentLabel === 'paid' ? 'ok' : paymentLabel === 'unpaid' ? 'warn' : 'pending'}
          label={paymentLabel}
        />
      </div>

      <p>{readText(booking.reason, 'No reason provided.')}</p>

      <div className="patient-booking-meta">
        <span>{booking.is_telemedicine ? 'Telemedicine' : 'Clinic visit'}</span>
        <span>Doctor ID: {readText(booking.doctor_id, 'N/A')}</span>
        <span>Patient: {readText(booking.patient_name, session?.name || 'Patient')}</span>
        <span>Phone: {readText(booking.patient_phone, session?.phone || 'N/A')}</span>
        <span>Appointment: {readText(booking.id, 'N/A')}</span>
      </div>

      <div className="patient-booking-actions">
        {paymentLabel !== 'paid' && booking.status !== 'cancelled' ? (
          <button type="button" onClick={() => onPay(booking)}>
            Complete payment
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="secondary-button"
            disabled={!isConnectedPatient || bookingBusyId === booking.id}
            onClick={() => onCancel(booking.id)}
          >
            {bookingBusyId === booking.id ? 'Cancelling...' : 'Cancel booking'}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function MyBookingsContent({ onNavigate }) {
  const {
    bookings,
    bookingsLoading,
    bookingSummary,
    isConnectedPatient,
    bookingBusyId,
    handleCancelBooking,
    preparePendingPaymentFromBooking,
    session,
  } = usePatientPortal()

  const groupedBookings = {
    unpaid: bookings.filter((booking) => booking.payment_status !== 'paid' && booking.status !== 'cancelled'),
    active: bookings.filter((booking) => booking.payment_status === 'paid' && booking.status !== 'cancelled'),
    cancelled: bookings.filter((booking) => booking.status === 'cancelled'),
  }

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>My bookings</h3>
          <span className="patient-mini-badge">{bookings.length} total</span>
        </div>

        <div className="patient-chip-row">
          <span className="patient-chip">{groupedBookings.unpaid.length} unpaid</span>
          <span className="patient-chip">{groupedBookings.active.length} paid</span>
          <span className="patient-chip">{bookingSummary.today} today</span>
          <span className="patient-chip">{groupedBookings.cancelled.length} cancelled</span>
        </div>

        {bookingsLoading ? <p className="empty-state">Loading your bookings...</p> : null}

        {!bookingsLoading && bookings.length === 0 ? (
          <p className="empty-state">No bookings yet. Your appointment requests will appear here.</p>
        ) : null}

        <div className="patient-bookings-stack">
          <h4>Payment pending appointments</h4>
          {groupedBookings.unpaid.length === 0 ? (
            <p className="empty-state">No unpaid appointments right now.</p>
          ) : null}
          {groupedBookings.unpaid.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              session={session}
              isConnectedPatient={isConnectedPatient}
              bookingBusyId={bookingBusyId}
              onCancel={handleCancelBooking}
              onPay={async (selectedBooking) => {
                await preparePendingPaymentFromBooking(selectedBooking)
                onNavigate('/patient/payment')
              }}
            />
          ))}

          <h4>Paid appointments</h4>
          {groupedBookings.active.length === 0 ? (
            <p className="empty-state">Paid appointments will appear here after successful payment.</p>
          ) : null}
          {groupedBookings.active.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              session={session}
              isConnectedPatient={isConnectedPatient}
              bookingBusyId={bookingBusyId}
              onCancel={handleCancelBooking}
              onPay={() => {}}
            />
          ))}

          {groupedBookings.cancelled.length > 0 ? <h4>Cancelled appointments</h4> : null}
          {groupedBookings.cancelled.map((booking) => (
            <article key={booking.id} className="patient-booking-card">
              <div className="patient-booking-topline">
                <div>
                  <strong>{readText(booking.doctor_name, 'Doctor')}</strong>
                  <p>
                    {readText(safeFormatDate(booking.appointment_date), 'Date pending')} |{' '}
                    {readText(safeFormatTime(booking.start_time), '--:--')} -{' '}
                    {readText(safeFormatTime(booking.end_time), '--:--')}
                  </p>
                </div>
                <StatusPill status="warn" label="cancelled" />
              </div>
              <div className="patient-booking-meta">
                <span>{booking.is_telemedicine ? 'Telemedicine' : 'Clinic visit'}</span>
                <span>Patient: {readText(booking.patient_name, session?.name || 'Patient')}</span>
              </div>
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
      <MyBookingsContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
