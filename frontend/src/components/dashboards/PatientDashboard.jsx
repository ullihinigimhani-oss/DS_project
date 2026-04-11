import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../StatusPill'
import {
  cancelPatientBooking,
  createPatientBooking,
  fetchDoctorAvailability,
  fetchPatientBookings,
} from '../../utils/appointmentService'

const patientSidebarItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'book', label: 'Book Appointment' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'symptoms', label: 'Symptom History' },
  { id: 'profile', label: 'Profile' },
]

function getMondayString(baseDate = new Date()) {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().split('T')[0]
}

function formatDate(value) {
  if (!value) return 'Date not set'

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return 'Time not set'
  return String(value).slice(0, 5)
}

function getBookingTone(status) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'pending'
  return 'warn'
}

function getInitials(name) {
  return String(name || 'Patient')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function PatientDashboard({
  activeRole,
  session,
  history,
  doctorDirectory,
  gatewayHealth,
  topCondition,
  onSignOut,
  onRequireLogin,
}) {
  const isConnectedPatient =
    activeRole === 'patient' &&
    session?.role === 'patient' &&
    session?.mode === 'connected' &&
    session?.token

  const [activeSection, setActiveSection] = useState('overview')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [weekStart, setWeekStart] = useState(getMondayString())
  const [availability, setAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingBusyId, setBookingBusyId] = useState('')
  const [reason, setReason] = useState('')
  const [isTelemedicine, setIsTelemedicine] = useState(false)
  const verifiedDoctors = doctorDirectory.filter((doctor) => doctor.verification_status === 'approved')

  useEffect(() => {
    if (!selectedDoctorId && verifiedDoctors.length) {
      setSelectedDoctorId(verifiedDoctors[0].doctor_id)
    }
  }, [selectedDoctorId, verifiedDoctors])

  const loadBookings = async () => {
    if (!isConnectedPatient) {
      setBookings([])
      return
    }

    setBookingsLoading(true)
    try {
      const data = await fetchPatientBookings(session.token)
      setBookings(Array.isArray(data.data) ? data.data : [])
    } catch (error) {
      setBookingError(error.message)
      setBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }

  const loadAvailability = async (doctorId = selectedDoctorId, nextWeekStart = weekStart) => {
    if (!doctorId) {
      setAvailability([])
      return
    }

    setAvailabilityLoading(true)
    try {
      const data = await fetchDoctorAvailability(doctorId, nextWeekStart)
      const slots = Array.isArray(data.data?.slots) ? data.data.slots : []
      setAvailability(slots)
    } catch (error) {
      setBookingError(error.message)
      setAvailability([])
    } finally {
      setAvailabilityLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [isConnectedPatient, session?.token])

  useEffect(() => {
    if (selectedDoctorId) {
      loadAvailability(selectedDoctorId, weekStart)
    }
  }, [selectedDoctorId, weekStart])

  const recentHistory = history.slice(0, 4)
  const selectedDoctor = verifiedDoctors.find((doctor) => doctor.doctor_id === selectedDoctorId) || null
  const availableSlots = availability.filter((slot) => !slot.isBooked)

  const bookingSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    return {
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === 'pending').length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      today: bookings.filter((booking) => booking.appointment_date === today).length,
    }
  }, [bookings])

  const patientMetrics = [
    {
      label: 'My bookings',
      value: String(bookingSummary.total),
      detail: bookingSummary.pending
        ? `${bookingSummary.pending} requests are waiting for doctor review.`
        : 'No pending booking actions right now.',
    },
    {
      label: 'Today',
      value: String(bookingSummary.today),
      detail: bookingSummary.today
        ? 'You have care activity scheduled for today.'
        : 'Nothing scheduled for today yet.',
    },
    {
      label: 'Doctors',
      value: String(verifiedDoctors.length),
      detail: verifiedDoctors.length
        ? 'Verified doctors are available for booking.'
        : 'No verified doctors are available for booking yet.',
    },
    {
      label: 'Symptom checks',
      value: String(history.length),
      detail: topCondition
        ? `Latest guidance points toward ${topCondition.name}.`
        : 'Run a symptom analysis to start your care journey.',
    },
  ]

  const activeSectionLabel =
    patientSidebarItems.find((item) => item.id === activeSection)?.label || 'Overview'

  const handleCreateBooking = async (slot) => {
    if (!isConnectedPatient || !selectedDoctor) {
      setBookingError('Sign in as a patient to create a real booking.')
      return
    }

    const slotKey = slot.id || `${slot.appointmentDate}-${slot.start_time}`

    setBookingBusyId(slotKey)
    setBookingError('')
    setBookingMessage('')

    try {
      await createPatientBooking(session.token, {
        doctorId: selectedDoctor.doctor_id,
        slotId: slot.id || undefined,
        appointmentDate: slot.appointmentDate,
        startTime: slot.start_time,
        endTime: slot.end_time,
        reason: reason || undefined,
        doctorName: selectedDoctor.name || 'Doctor',
        patientName: session?.name || 'Patient',
        isTelemedicine,
      })

      setReason('')
      setIsTelemedicine(false)
      await Promise.all([loadBookings(), loadAvailability()])
      setActiveSection('bookings')
      setBookingMessage('Appointment request created successfully.')
    } catch (error) {
      setBookingError(error.message)
    } finally {
      setBookingBusyId('')
    }
  }

  const handleCancelBooking = async (appointmentId) => {
    if (!isConnectedPatient) return

    setBookingBusyId(appointmentId)
    setBookingError('')
    setBookingMessage('')

    try {
      await cancelPatientBooking(session.token, appointmentId)
      await Promise.all([loadBookings(), loadAvailability()])
      setBookingMessage('Appointment cancelled successfully.')
    } catch (error) {
      setBookingError(error.message)
    } finally {
      setBookingBusyId('')
    }
  }

  const handleDoctorSelect = (doctorId) => {
    setSelectedDoctorId(doctorId)
    setActiveSection('book')
  }

  if (activeRole !== 'patient') {
    return (
      <div className="patient-portal-guard">
        <div className="patient-portal-guard-card">
          <p className="patient-sidebar-kicker">Arogya Patient Portal</p>
          <h2>Patient login is required before the dashboard can open.</h2>
          <p>
            Use the shared login or registration page, choose the patient role, and the app will
            redirect you into this dashboard automatically.
          </p>
          <div className="patient-toolbar">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onRequireLogin('/register')}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderOverview = () => (
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
            <button type="button" className="patient-chip-button" onClick={() => setActiveSection('book')}>
              Book appointment
            </button>
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => setActiveSection('bookings')}
            >
              Review bookings
            </button>
            <button type="button" className="patient-chip-button" onClick={() => setActiveSection('doctors')}>
              Browse doctors
            </button>
            <button
              type="button"
              className="patient-chip-button"
              onClick={() => setActiveSection('symptoms')}
            >
              View symptom history
            </button>
          </div>
        </article>
      </div>
    </div>
  )

  const renderBookingComposer = () => (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Book an appointment</h3>
          <span className="patient-mini-badge">{availableSlots.length} open slots</span>
        </div>

        {!isConnectedPatient ? (
          <p className="empty-state">
            Sign in as a patient to create real bookings. You can still browse verified doctors
            and available slots from this dashboard.
          </p>
        ) : null}

        <div className="patient-booking-shell">
          <div className="patient-booking-form">
            <label className="patient-field">
              Select doctor
              <select
                value={selectedDoctorId}
                onChange={(event) => setSelectedDoctorId(event.target.value)}
              >
                {verifiedDoctors.map((doctor) => (
                  <option key={doctor.doctor_id} value={doctor.doctor_id}>
                    {doctor.name || 'Doctor'} - {doctor.specialization || 'General Practice'}
                  </option>
                ))}
              </select>
            </label>

            {selectedDoctor ? (
              <div className="patient-doctor-spotlight">
                <strong>{selectedDoctor.name || 'Doctor'}</strong>
                <p>{selectedDoctor.specialization || 'General Practice'}</p>
                <span>Consultation fee: {selectedDoctor.consultation_fee ?? 'N/A'}</span>
              </div>
            ) : (
              <p className="empty-state">No verified doctors are available for booking yet.</p>
            )}

            <div className="patient-week-row">
              <label className="patient-field compact">
                Week starting
                <input
                  type="date"
                  value={weekStart}
                  onChange={(event) => setWeekStart(event.target.value)}
                />
              </label>
              <label className="patient-toggle">
                <input
                  type="checkbox"
                  checked={isTelemedicine}
                  onChange={(event) => setIsTelemedicine(event.target.checked)}
                />
                Telemedicine visit
              </label>
            </div>

            <label className="patient-field">
              Visit reason
              <textarea
                rows="4"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Share a short reason for the consultation."
              />
            </label>
          </div>

          <div className="patient-slot-panel">
            {availabilityLoading ? <p className="empty-state">Loading available slots...</p> : null}

            {!availabilityLoading && availableSlots.length === 0 ? (
              <p className="empty-state">
                No open slots are available for this doctor in the selected week yet.
              </p>
            ) : null}

            <div className="patient-slot-grid">
              {availableSlots.map((slot) => {
                const slotKey = slot.id || `${slot.appointmentDate}-${slot.start_time}`
                return (
                  <article key={slotKey} className="patient-slot-card">
                    <strong>{formatDate(slot.appointmentDate)}</strong>
                    <p>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </p>
                    <button
                      type="button"
                      disabled={!isConnectedPatient || bookingBusyId === slotKey}
                      onClick={() => handleCreateBooking(slot)}
                    >
                      {bookingBusyId === slotKey ? 'Booking...' : 'Book this slot'}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )

  const renderBookings = () => (
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

  const renderDoctors = () => (
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
                onClick={() => handleDoctorSelect(doctor.doctor_id)}
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

  const renderSymptoms = () => (
    <div className="patient-content-grid">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Care guidance</h3>
          <StatusPill
            status={topCondition ? 'ok' : 'pending'}
            label={topCondition ? 'Latest analysis ready' : 'No recent triage'}
          />
        </div>
        <p className="patient-callout patient-callout-panel">
          {topCondition
            ? `Your latest symptom analysis suggests ${topCondition.name}. Booking with a doctor can help turn this guidance into a proper consult.`
            : 'No recent symptom analysis yet. Start with the AI symptoms route if you want a quick triage before booking.'}
        </p>
      </section>

      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Symptom history</h3>
          <span className="patient-mini-badge">{history.length} saved</span>
        </div>
        {recentHistory.length ? (
          <div className="patient-history-stack">
            {recentHistory.map((item) => (
              <article key={item.id} className="patient-history-card">
                <strong>{new Date(item.analyzed_at).toLocaleDateString()}</strong>
                <p>{item.symptoms}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No symptom history yet. Run a symptom check to begin tracking.</p>
        )}
      </section>
    </div>
  )

  const renderProfile = () => (
    <div className="patient-content-grid">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Profile</h3>
          <StatusPill status={isConnectedPatient ? 'ok' : 'warn'} label={isConnectedPatient ? 'Connected' : 'Preview'} />
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

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'book':
        return renderBookingComposer()
      case 'bookings':
        return renderBookings()
      case 'doctors':
        return renderDoctors()
      case 'symptoms':
        return renderSymptoms()
      case 'profile':
        return renderProfile()
      case 'overview':
      default:
        return renderOverview()
    }
  }

  return (
    <div className="patient-portal">
      <aside className="patient-portal-sidebar">
        <div className="patient-portal-brand">
          <div className="patient-brand-mark">AR</div>
          <div>
            <strong>Arogya</strong>
            <span>Patient Workspace</span>
          </div>
        </div>

        <nav className="patient-portal-nav">
          {patientSidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`patient-portal-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="patient-portal-footer">
          <div className="patient-portal-user">
            <div className="patient-avatar">{getInitials(session?.name)}</div>
            <div>
              <strong>{session?.name || 'Patient'}</strong>
              <span>{session?.email || 'patient@example.com'}</span>
            </div>
          </div>
          <button type="button" className="patient-signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="patient-portal-main">
        <header className="patient-portal-header">
          <div>
            <p className="patient-portal-section-label">{activeSectionLabel}</p>
            <h1>{activeSectionLabel}</h1>
          </div>
          <div className="patient-portal-header-user">
            <div className="patient-avatar small">{getInitials(session?.name)}</div>
            <div>
              <strong>{session?.name || 'Patient'}</strong>
              <span>{topCondition?.name || 'Care plan in progress'}</span>
            </div>
          </div>
        </header>

        {bookingError ? <p className="error-text">{bookingError}</p> : null}
        {bookingMessage ? <p className="patient-success">{bookingMessage}</p> : null}

        {renderActiveSection()}
      </section>
    </div>
  )
}
