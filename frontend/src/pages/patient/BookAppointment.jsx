import PatientPortalPage from './PatientPortalPage'
import ModernSelect from '../../components/ModernSelect'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'
import { useMemo } from 'react'

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
  const bookingFormComplete = Boolean(
    selectedDoctor &&
      reason.trim() &&
      patientNameInput.trim() &&
      patientPhoneInput.trim(),
  )

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
              <ModernSelect
                value={selectedDoctorId}
                onChange={(event) => setSelectedDoctorId(event.target.value)}
                placeholder="Choose a verified doctor"
                options={verifiedDoctors.map((doctor) => ({
                  value: doctor.doctor_id,
                  label: `${doctor.name || 'Doctor'} - ${doctor.specialization || 'General Practice'}`,
                }))}
              />
            </div>

            {selectedDoctor ? (
              <div className="patient-doctor-spotlight">
                <strong>{selectedDoctor.name || 'Doctor'}</strong>
                <p>{selectedDoctor.specialization || 'General Practice'}</p>
                <span>Consultation fee: {selectedDoctor.consultation_fee ?? 'N/A'}</span>
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
            <label className="patient-field">
              Patient name (required)
              <input
                type="text"
                value={patientNameInput}
                onChange={(event) => setPatientNameInput(event.target.value)}
                placeholder="Enter patient name"
              />
            </label>
            <label className="patient-field">
              Patient phone (required)
              <input
                type="tel"
                value={patientPhoneInput}
                onChange={(event) => setPatientPhoneInput(event.target.value)}
                placeholder="Enter patient phone"
              />
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
                        Fill required fields: reason, patient name, and patient phone.
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
