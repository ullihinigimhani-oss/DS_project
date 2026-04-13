import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'

function BookAppointmentContent({ onNavigate }) {
  const {
    isConnectedPatient,
    availableSlots,
    availabilityLoading,
    bookingBusyId,
    bookingDraft,
    selectedDoctorId,
    verifiedDoctors,
    selectedDoctor,
    suggestedDoctor,
    weekStart,
    isTelemedicine,
    reason,
    setSelectedDoctorId,
    setWeekStart,
    setIsTelemedicine,
    setReason,
    clearBookingDraft,
    handleCreateBooking,
  } = usePatientPortal()

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Book an appointment</h3>
          <span className="patient-mini-badge">{availableSlots.length} open slots</span>
        </div>

        {bookingDraft ? (
          <div className="patient-booking-draft">
            <div className="patient-booking-draft-topline">
              <div>
                <span>Prepared from AI symptom guidance</span>
                <strong>{bookingDraft.topConditionName}</strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={clearBookingDraft}
              >
                Clear draft
              </button>
            </div>
            <div className="patient-booking-draft-grid">
              <article className="patient-booking-draft-card">
                <span>Recommended specialist</span>
                <strong>{bookingDraft.recommendedSpecialist}</strong>
                <p>We used the latest AI guidance to suggest the most relevant clinician.</p>
              </article>
              <article className="patient-booking-draft-card">
                <span>Care priority</span>
                <strong>{bookingDraft.carePriority}</strong>
                <p>
                  {bookingDraft.carePriority === 'urgent'
                    ? 'Try to arrange care as soon as possible.'
                    : 'You can use the available slot list below to choose a suitable visit.'}
                </p>
              </article>
              <article className="patient-booking-draft-card">
                <span>Suggested doctor</span>
                <strong>{suggestedDoctor?.name || selectedDoctor?.name || 'Select a doctor'}</strong>
                <p>
                  {suggestedDoctor
                    ? `${suggestedDoctor.specialization || 'General Practice'} matched the recommended specialty.`
                    : 'No exact specialist match was found, so you can choose any verified doctor.'}
                </p>
              </article>
            </div>
            <div className="patient-booking-draft-notes">
              <strong>Visit summary</strong>
              <p>{bookingDraft.symptomSummary}</p>
            </div>
          </div>
        ) : null}

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
                      onClick={async () => {
                        const created = await handleCreateBooking(slot)
                        if (created) {
                          onNavigate('/patient/my-bookings')
                        }
                      }}
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
}

export default function BookAppointment(props) {
  return (
    <PatientPortalPage {...props}>
      <BookAppointmentContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
