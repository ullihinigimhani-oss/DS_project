import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'
import { useMemo } from 'react'

// Validation helper for 10-digit phone number
function isValidPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '')
  return cleaned.length === 10
}

// Fixed booking fee constant
const FIXED_BOOKING_FEE = 2000

function BookAppointmentContent({ onNavigate }) {
  const {
    isConnectedPatient,
    availability,
    availabilityLoading,
    bookingBusyId,
    bookingDraft,
    selectedDoctorId,
    doctorFilterQuery,
    filteredVerifiedDoctors,
    selectedDoctor,
    suggestedDoctor,
    isTelemedicine,
    isDifferentPatient,
    reason,
    patientNameInput,
    patientPhoneInput,
    pendingPaymentBooking,
    setSelectedDoctorId,
    setDoctorFilterQuery,
    setIsTelemedicine,
    setReason,
    setPatientNameInput,
    setPatientPhoneInput,
    setIsDifferentPatient,
    clearBookingDraft,
    handleCreateBooking,
  } = usePatientPortal()

  const slotWindows = useMemo(() => {
    const groups = new Map()

    availability.forEach((slot) => {
      const groupKey =
        slot.slot_group_key ||
        `${slot.appointmentDate}-${slot.source_slot_start_time || slot.start_time}-${slot.source_slot_end_time || slot.end_time}`

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          appointmentDate: slot.appointmentDate,
          windowStart: slot.source_slot_start_time || slot.start_time,
          windowEnd: slot.source_slot_end_time || slot.end_time,
          chunks: [],
        })
      }

      groups.get(groupKey).chunks.push(slot)
    })

    return Array.from(groups.values())
      .map((group) => {
        const sortedChunks = [...group.chunks].sort((a, b) =>
          String(a.start_time).localeCompare(String(b.start_time)),
        )
        const nextAvailable = sortedChunks.find((slot) => !slot.isBooked) || null
        const total = sortedChunks.length
        const booked = sortedChunks.filter((slot) => slot.isBooked).length

        return {
          ...group,
          nextAvailable,
          totalAppointmentsInWindow: total,
          bookedAppointmentsInWindow: booked,
          remainingAppointmentsInWindow: Math.max(total - booked, 0),
        }
      })
      .sort((left, right) => {
        const dateCompare = String(left.appointmentDate).localeCompare(String(right.appointmentDate))
        if (dateCompare !== 0) return dateCompare
        return String(left.windowStart).localeCompare(String(right.windowStart))
      })
  }, [availability])

  const bookableWindows = slotWindows.filter((window) => window.nextAvailable)
  const isPhoneValid = isValidPhone(patientPhoneInput)
  const bookingFormComplete = Boolean(
    selectedDoctor &&
      reason.trim() &&
      patientNameInput.trim() &&
      isPhoneValid,
  )

  // Calculate total cost: fixed booking fee + doctor consultation fee
  const consultationFee = selectedDoctor?.consultation_fee ? Number(selectedDoctor.consultation_fee) : 0
  const totalCost = FIXED_BOOKING_FEE + consultationFee

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Book an appointment</h3>
          <span className="patient-mini-badge">{bookableWindows.length} open slot windows</span>
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
            <div className="patient-field">
              Select doctor
              <input
                type="text"
                value={doctorFilterQuery}
                onChange={(event) => setDoctorFilterQuery(event.target.value)}
                placeholder="Filter by doctor name or specialization"
              />
              <select
                value={selectedDoctorId}
                onChange={(event) => setSelectedDoctorId(event.target.value)}
              >
                {filteredVerifiedDoctors.map((doctor) => (
                  <option key={doctor.doctor_id} value={doctor.doctor_id}>
                    {doctor.name || 'Doctor'} - {doctor.specialization || 'General Practice'}
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctor ? (
              <div className="patient-doctor-spotlight">
                <strong>{selectedDoctor.name || 'Doctor'}</strong>
                <p>{selectedDoctor.specialization || 'General Practice'}</p>
                
                <div className="patient-fee-breakdown">
                  <div className="patient-fee-row">
                    <span>Booking fee:</span>
                    <strong>₹{FIXED_BOOKING_FEE.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="patient-fee-row">
                    <span>Consultation fee:</span>
                    <strong>₹{consultationFee.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="patient-fee-row patient-fee-total">
                    <span>Total cost:</span>
                    <strong>₹{totalCost.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {pendingPaymentBooking ? (
                  <div className="patient-booking-draft-notes">
                    <strong>Appointment form fields (from model)</strong>
                    <p>doctor_id: {pendingPaymentBooking.doctorId || selectedDoctor.doctor_id}</p>
                    <p>appointment_date: {pendingPaymentBooking.appointmentDate}</p>
                    <p>start_time: {pendingPaymentBooking.startTime}</p>
                    <p>end_time: {pendingPaymentBooking.endTime}</p>
                    <p>reason: {pendingPaymentBooking.reason || 'N/A'}</p>
                    <p>doctor_name: {pendingPaymentBooking.doctorName || selectedDoctor.name || 'Doctor'}</p>
                    <p>patient_name: {pendingPaymentBooking.patientName || patientNameInput || 'N/A'}</p>
                    <p>patient_phone: {pendingPaymentBooking.patientPhone || patientPhoneInput || 'N/A'}</p>
                    <p>is_telemedicine: {pendingPaymentBooking.isTelemedicine ? 'true' : 'false'}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="empty-state">No verified doctors are available for booking yet.</p>
            )}

            <div className="patient-week-row">
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

            <div className="patient-week-row">
              <label className="patient-toggle">
                <input
                  type="checkbox"
                  checked={isDifferentPatient}
                  onChange={(event) => setIsDifferentPatient(event.target.checked)}
                />
                This is a different patient
              </label>
            </div>

            <label className="patient-field">
              Patient name (required)
              <input
                type="text"
                value={patientNameInput}
                onChange={(event) => setPatientNameInput(event.target.value)}
                placeholder={isDifferentPatient ? "Enter patient name" : "Patient name"}
                disabled={!isDifferentPatient}
              />
            </label>

            <label className="patient-field">
              Patient phone (required)
              <input
                type="tel"
                value={patientPhoneInput}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '')
                  setPatientPhoneInput(value)
                }}
                placeholder="Enter 10-digit phone number (e.g., 9876543210)"
                maxLength="10"
              />
              {patientPhoneInput && !isPhoneValid ? (
                <p style={{ color: '#d64545', fontSize: '0.85rem', marginTop: '4px' }}>
                  Phone number must be exactly 10 digits
                </p>
              ) : null}
              {isPhoneValid ? (
                <p style={{ color: '#1d9e75', fontSize: '0.85rem', marginTop: '4px' }}>
                  ✓ Valid phone number
                </p>
              ) : null}
            </label>
          </div>

          <div className="patient-slot-panel">
            {availabilityLoading ? <p className="empty-state">Loading available slots...</p> : null}

            {!availabilityLoading && slotWindows.length === 0 ? (
              <p className="empty-state">
                No open slots are available for this doctor in the selected week yet.
              </p>
            ) : null}

            <div className="patient-slot-grid">
              {slotWindows.map((slotWindow) => {
                const nextSlot = slotWindow.nextAvailable
                const slotKey = slotWindow.key
                return (
                  <article key={slotKey} className="patient-slot-card">
                    <strong>{formatDate(slotWindow.appointmentDate)}</strong>
                    <p>
                      {formatTime(slotWindow.windowStart)} - {formatTime(slotWindow.windowEnd)}
                    </p>
                    <span>
                      Booked in this window: {slotWindow.bookedAppointmentsInWindow}/
                      {slotWindow.totalAppointmentsInWindow}
                    </span>
                    <p>
                      {nextSlot
                        ? `Next available appointment: ${formatTime(nextSlot.start_time)} - ${formatTime(nextSlot.end_time)}`
                        : 'No free 15-minute appointment left in this window.'}
                    </p>
                    <button
                      type="button"
                      disabled={
                        !isConnectedPatient ||
                        !nextSlot ||
                        bookingBusyId === slotKey ||
                        !bookingFormComplete
                      }
                      onClick={async () => {
                        if (!nextSlot) return
                        const created = await handleCreateBooking(nextSlot)
                        if (created) {
                          onNavigate('/patient/payment')
                        }
                      }}
                    >
                      {bookingBusyId === slotKey ? 'Booking...' : 'Book next appointment'}
                    </button>
                    {!bookingFormComplete ? (
                      <p className="empty-state">
                        {!selectedDoctor ? 'Select a doctor' : !reason.trim() ? 'Enter visit reason' : !patientNameInput.trim() ? 'Enter patient name' : !isPhoneValid ? 'Phone must be 10 digits' : 'Complete required fields'}
                      </p>
                    ) : null}
                  </article>
                )
              })}
            </div>
            {pendingPaymentBooking ? (
              <p className="empty-state">
                A booking is waiting for payment. Continue from the payment page.
              </p>
            ) : null}
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
