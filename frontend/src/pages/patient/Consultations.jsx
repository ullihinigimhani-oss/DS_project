import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../../components/StatusPill'
import VideoRoom from '../../components/VideoRoom'
import {
  fetchTelemedicineSessionByAppointment,
  fetchTelemedicineSessions,
} from '../../utils/telemedicineService'
import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, getBookingTone, usePatientPortal } from './PatientPortalContext'

function PatientConsultationsContent({ onNavigate }) {
  const {
    session,
    bookings,
    bookingsLoading,
    bookingError,
    isConnectedPatient,
  } = usePatientPortal()
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionMessage, setSessionMessage] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [activeSessionId, setActiveSessionId] = useState('')

  const telemedicineBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.is_telemedicine &&
          (booking.status === 'confirmed' || booking.status === 'pending'),
      ),
    [bookings],
  )

  useEffect(() => {
    if (!isConnectedPatient || !session?.token) {
      setSessions([])
      return
    }

    let cancelled = false

    const loadSessions = async () => {
      setSessionsLoading(true)
      try {
        const response = await fetchTelemedicineSessions(session.token)
        if (!cancelled) {
          setSessions(Array.isArray(response.data) ? response.data : [])
        }
      } catch {
        if (!cancelled) {
          setSessions([])
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false)
        }
      }
    }

    loadSessions()

    return () => {
      cancelled = true
    }
  }, [isConnectedPatient, session?.token])

  useEffect(() => {
    if (!telemedicineBookings.length) {
      setSelectedBookingId('')
      return
    }

    if (!telemedicineBookings.some((booking) => booking.id === selectedBookingId)) {
      setSelectedBookingId(telemedicineBookings[0].id)
    }
  }, [selectedBookingId, telemedicineBookings])

  const selectedBooking =
    telemedicineBookings.find((booking) => booking.id === selectedBookingId) ||
    telemedicineBookings[0] ||
    null

  const selectedSession =
    sessions.find((item) => item.appointment_id === selectedBooking?.id) || null

  const handleOpenConsultation = async (booking) => {
    const existingSession = sessions.find((item) => item.appointment_id === booking.id)

    if (existingSession) {
      setActiveSessionId(existingSession.id)
      return
    }

    try {
      const response = await fetchTelemedicineSessionByAppointment(session.token, booking.id)
      const nextSession = response.data
      setSessions((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextSession.id)
        return [nextSession, ...withoutCurrent]
      })
      setSessionMessage('The consultation room is ready. You can join now.')
      setActiveSessionId(nextSession.id)
    } catch (error) {
      setSessionMessage(error.message || 'The doctor has not prepared this room yet.')
    }
  }

  const copyInviteLink = async (meetingUrl) => {
    try {
      await window.navigator.clipboard.writeText(meetingUrl)
      setSessionMessage('Consultation link copied to your clipboard.')
    } catch {
      setSessionMessage('Could not copy the consultation link in this browser.')
    }
  }

  if (activeSessionId) {
    return (
      <VideoRoom
        sessionId={activeSessionId}
        peerName={selectedBooking?.doctor_name || 'Consultation room'}
        onEndRedirect={() => setActiveSessionId('')}
      />
    )
  }

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Telemedicine consultations</h3>
          <span className="patient-mini-badge">{telemedicineBookings.length} eligible visits</span>
        </div>
        <p>
          Join your confirmed telemedicine visits from here. When a doctor prepares the online
          room, you can open it directly or copy the invite link.
        </p>

        {sessionMessage ? <p className="patient-success">{sessionMessage}</p> : null}
        {bookingError && !sessionMessage ? <p className="error-text">{bookingError}</p> : null}
      </section>

      <div className="patient-telemedicine-layout">
        <section className="patient-surface-card">
          <div className="patient-card-topline">
            <div>
              <h3>Upcoming telemedicine visits</h3>
              <p className="patient-section-support">
                Select one booking to see if the online consultation room is ready.
              </p>
            </div>
            <span className="patient-mini-badge">
              {sessionsLoading ? 'syncing...' : `${sessions.length} rooms`}
            </span>
          </div>

          {bookingsLoading ? <p className="empty-state">Loading your telemedicine visits...</p> : null}

          {!bookingsLoading && telemedicineBookings.length === 0 ? (
            <div className="patient-empty-panel">
              <strong>No telemedicine bookings yet.</strong>
              <p>
                Book a telemedicine visit first, and your online consultation rooms will appear
                here automatically once they are prepared.
              </p>
              <div className="patient-toolbar">
                <button type="button" onClick={() => onNavigate('/patient/book-appointment')}>
                  Book telemedicine visit
                </button>
              </div>
            </div>
          ) : null}

          <div className="patient-telemedicine-stack">
            {telemedicineBookings.map((booking) => {
              const bookingSession = sessions.find((item) => item.appointment_id === booking.id)

              return (
                <button
                  key={booking.id}
                  type="button"
                  className={`patient-telemedicine-card ${selectedBookingId === booking.id ? 'active' : ''}`}
                  onClick={() => setSelectedBookingId(booking.id)}
                >
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
                  <div className="patient-booking-meta">
                    <span>{bookingSession ? 'Room ready' : 'Waiting for room'}</span>
                    <span>{booking.reason || 'No visit note yet'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="patient-surface-card">
          <div className="patient-card-topline">
            <h3>Consultation room</h3>
            {selectedBooking ? (
              <StatusPill status={getBookingTone(selectedBooking.status)} label={selectedBooking.status} />
            ) : null}
          </div>

          {!selectedBooking ? (
            <div className="patient-empty-panel">
              <strong>Select a telemedicine booking.</strong>
              <p>The room status, meeting link, and join action will appear here.</p>
            </div>
          ) : (
            <>
              <div className="patient-booking-draft-card">
                <div className="patient-booking-draft-topline">
                  <div>
                    <strong>{selectedBooking.doctor_name || 'Doctor'}</strong>
                    <p>
                      {formatDate(selectedBooking.appointment_date)} | {formatTime(selectedBooking.start_time)} -{' '}
                      {formatTime(selectedBooking.end_time)}
                    </p>
                  </div>
                  <span className="patient-chip">Telemedicine visit</span>
                </div>

                {selectedBooking.reason ? <p>{selectedBooking.reason}</p> : null}
              </div>

              {selectedSession ? (
                <>
                  <div className="patient-note-panel">
                    <strong>Room status</strong>
                    <p>
                      Your consultation room is ready. Use the actions below to join in-app, copy
                      the invite URL, or open the meeting in a new browser tab.
                    </p>
                  </div>

                  <div className="patient-detail-list">
                    <div className="patient-detail-row">
                      <span>Session ID</span>
                      <strong>{selectedSession.id}</strong>
                    </div>
                    <div className="patient-detail-row">
                      <span>Meeting room</span>
                      <strong>{selectedSession.meeting_room}</strong>
                    </div>
                    <div className="patient-detail-row">
                      <span>Status</span>
                      <strong>{selectedSession.status}</strong>
                    </div>
                  </div>

                  <div className="patient-telemedicine-link-box">
                    <span>Meeting link</span>
                    <strong>{selectedSession.meeting_url}</strong>
                  </div>

                  <div className="patient-booking-actions">
                    {selectedSession.status !== 'ended' ? (
                      <>
                        <button type="button" onClick={() => setActiveSessionId(selectedSession.id)}>
                          Join consultation
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => copyInviteLink(selectedSession.meeting_url)}
                        >
                          Copy invite link
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => window.open(selectedSession.meeting_url, '_blank', 'noopener,noreferrer')}
                        >
                          Open in new tab
                        </button>
                      </>
                    ) : (
                      <span className="patient-chip">Session ended</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="patient-empty-panel">
                  <strong>Waiting for the doctor to prepare the room.</strong>
                  <p>
                    Once the doctor opens the telemedicine room, you will be able to join it here
                    immediately.
                  </p>
                  <div className="patient-toolbar">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleOpenConsultation(selectedBooking)}
                    >
                      Check room again
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function PatientConsultations(props) {
  return (
    <PatientPortalPage {...props}>
      <PatientConsultationsContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
