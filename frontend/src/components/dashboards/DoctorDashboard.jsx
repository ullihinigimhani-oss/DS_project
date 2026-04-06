import { useEffect, useState } from 'react'
import StatusPill from '../StatusPill'
import {
  addDoctorScheduleSlot,
  deleteDoctorScheduleSlot,
  fetchDoctorDocuments,
  fetchDoctorPrescriptions,
  fetchDoctorProfile,
  fetchDoctorSchedule,
  fetchDoctorVerificationStatus,
  issueDoctorPrescription,
  setDoctorScheduleType,
  submitDoctorVerification,
  toggleDoctorScheduleSlot,
  updateDoctorProfile,
  uploadDoctorDocument,
} from '../../utils/doctorService'

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(value) {
  if (!value) return 'Time not set'
  return String(value).slice(0, 5)
}

export default function DoctorDashboard({ activeRole, session }) {
  const isDoctor = activeRole === 'doctor'
  const isConnected = session?.mode === 'connected' && session?.token
  const doctorId = session?.userId

  const [profile, setProfile] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [verification, setVerification] = useState(null)
  const [documents, setDocuments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [profileValues, setProfileValues] = useState({
    name: session?.name || '',
    specialization: '',
    consultationFee: '',
    bio: '',
  })

  const [slotValues, setSlotValues] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '10:00',
    weekStart: '',
  })

  const [verificationValues, setVerificationValues] = useState({
    documentType: 'license',
    file: null,
  })

  const [prescriptionValues, setPrescriptionValues] = useState({
    patientId: '',
    appointmentId: '',
    patientName: '',
    medications: '',
    notes: '',
  })

  const loadDoctorWorkspace = async () => {
    if (!isConnected || !doctorId) return

    setLoading(true)
    setError('')

    try {
      const [profileData, scheduleData, verificationData, documentsData, prescriptionsData] =
        await Promise.all([
          fetchDoctorProfile(session.token),
          fetchDoctorSchedule(session.token),
          fetchDoctorVerificationStatus(session.token, doctorId),
          fetchDoctorDocuments(session.token, doctorId),
          fetchDoctorPrescriptions(session.token),
        ])

      const nextProfile = profileData.data
      setProfile(nextProfile)
      setSchedule(scheduleData.data)
      setVerification(verificationData.data)
      setDocuments(Array.isArray(documentsData.data) ? documentsData.data : [])
      setPrescriptions(Array.isArray(prescriptionsData.data) ? prescriptionsData.data : [])

      if (nextProfile) {
        setProfileValues({
          name: nextProfile.name || session?.name || '',
          specialization: nextProfile.specialization || '',
          consultationFee: nextProfile.consultation_fee ? String(nextProfile.consultation_fee) : '',
          bio: nextProfile.bio || '',
        })
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoctorWorkspace()
  }, [doctorId, isConnected, session?.token])

  if (!isDoctor) {
    return (
      <div className="doctor-dashboard doctor-dashboard-placeholder">
        <strong>Doctor workspace preview is waiting for the doctor role.</strong>
        <p>
          Choose <strong>doctor</strong> on the login screen to see the doctor dashboard with
          profile, schedule, verification, and prescription tools.
        </p>
      </div>
    )
  }

  const overviewCards = [
    {
      label: 'Session mode',
      value: isConnected ? 'Connected doctor' : 'Preview doctor',
      detail: session?.email || 'doctor@example.com',
    },
    {
      label: 'Verification',
      value: verification?.status || 'Pending',
      detail: verification
        ? `${verification.documentsSubmitted}/${verification.totalRequired} documents tracked`
        : 'Upload and submit documents when connected',
    },
    {
      label: 'Schedule type',
      value: schedule?.schedule_type || 'Not set',
      detail: schedule?.slots?.length
        ? `${schedule.slots.length} slots configured`
        : 'No slots configured yet',
    },
    {
      label: 'Prescriptions',
      value: String(prescriptions.length),
      detail: prescriptions.length ? 'Issued by this doctor account' : 'No prescriptions issued yet',
    },
  ]

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileValues((current) => ({ ...current, [name]: value }))
  }

  const handleSlotChange = (event) => {
    const { name, value } = event.target
    setSlotValues((current) => ({ ...current, [name]: value }))
  }

  const handlePrescriptionChange = (event) => {
    const { name, value } = event.target
    setPrescriptionValues((current) => ({ ...current, [name]: value }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!isConnected) {
      setMessage('Preview mode is active. Sign in with a real doctor account to save profile changes.')
      return
    }

    setMessage('')
    setError('')

    try {
      const result = await updateDoctorProfile(session.token, profileValues)
      setProfile(result.data)
      setMessage('Doctor profile saved successfully.')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleScheduleType = async (scheduleType) => {
    if (!isConnected) {
      setMessage('Preview mode is active. Connected doctor auth is required to change schedule type.')
      return
    }

    setMessage('')
    setError('')

    try {
      await setDoctorScheduleType(session.token, scheduleType)
      await loadDoctorWorkspace()
      setMessage(`Schedule type switched to ${scheduleType}.`)
    } catch (scheduleError) {
      setError(scheduleError.message)
    }
  }

  const handleAddSlot = async (event) => {
    event.preventDefault()
    if (!isConnected) {
      setMessage('Preview mode is active. Connected doctor auth is required to add slots.')
      return
    }

    setMessage('')
    setError('')

    try {
      await addDoctorScheduleSlot(session.token, {
        dayOfWeek: Number(slotValues.dayOfWeek),
        startTime: slotValues.startTime,
        endTime: slotValues.endTime,
        weekStart: slotValues.weekStart || undefined,
      })
      await loadDoctorWorkspace()
      setMessage('New schedule slot added.')
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleToggleSlot = async (slotId, isAvailable) => {
    if (!isConnected) return

    setError('')

    try {
      await toggleDoctorScheduleSlot(session.token, slotId, !isAvailable)
      await loadDoctorWorkspace()
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleDeleteSlot = async (slotId) => {
    if (!isConnected) return

    setError('')

    try {
      await deleteDoctorScheduleSlot(session.token, slotId)
      await loadDoctorWorkspace()
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleVerificationFile = (event) => {
    const file = event.target.files?.[0] || null
    setVerificationValues((current) => ({ ...current, file }))
  }

  const handleVerificationType = (event) => {
    setVerificationValues((current) => ({ ...current, documentType: event.target.value }))
  }

  const handleUploadDocument = async (event) => {
    event.preventDefault()
    if (!isConnected) {
      setMessage('Preview mode is active. Connected doctor auth is required to upload documents.')
      return
    }

    if (!verificationValues.file) {
      setError('Please choose a PDF document first.')
      return
    }

    setMessage('')
    setError('')

    try {
      await uploadDoctorDocument(session.token, verificationValues.file, verificationValues.documentType)
      setVerificationValues((current) => ({ ...current, file: null }))
      await loadDoctorWorkspace()
      setMessage('Verification document uploaded.')
    } catch (uploadError) {
      setError(uploadError.message)
    }
  }

  const handleSubmitVerification = async () => {
    if (!isConnected) {
      setMessage('Preview mode is active. Connected doctor auth is required to submit verification.')
      return
    }

    setMessage('')
    setError('')

    try {
      await submitDoctorVerification(session.token)
      await loadDoctorWorkspace()
      setMessage('Verification documents submitted for review.')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const handleIssuePrescription = async (event) => {
    event.preventDefault()
    if (!isConnected) {
      setMessage('Preview mode is active. Connected doctor auth is required to issue prescriptions.')
      return
    }

    const medications = prescriptionValues.medications
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    if (!prescriptionValues.patientId || medications.length === 0) {
      setError('Patient ID and at least one medication are required.')
      return
    }

    setMessage('')
    setError('')

    try {
      await issueDoctorPrescription(session.token, {
        patientId: prescriptionValues.patientId,
        appointmentId: prescriptionValues.appointmentId || undefined,
        doctorName: profile?.name || session?.name || 'Doctor',
        patientName: prescriptionValues.patientName || undefined,
        medications,
        notes: prescriptionValues.notes || undefined,
      })
      setPrescriptionValues({
        patientId: '',
        appointmentId: '',
        patientName: '',
        medications: '',
        notes: '',
      })
      await loadDoctorWorkspace()
      setMessage('Prescription issued successfully.')
    } catch (prescriptionError) {
      setError(prescriptionError.message)
    }
  }

  return (
    <div className="doctor-dashboard">
      <div className="doctor-overview-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="doctor-overview-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="doctor-callout">
        <strong>Doctor module focus:</strong> profile management, schedule setup, verification
        readiness, and prescription issuing all sit in one workspace now.
      </div>

      {loading ? <p className="empty-state">Loading doctor workspace...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="empty-state">{message}</p> : null}

      {!isConnected ? (
        <div className="doctor-preview-grid">
          <article className="doctor-panel">
            <div className="journey-card-header">
              <h3>Preview mode</h3>
              <StatusPill status="warn" label="No live token" />
            </div>
            <p>
              Sign in with a real doctor account to load your saved doctor profile, schedule,
              prescriptions, and verification records from the backend.
            </p>
          </article>

          <article className="doctor-panel">
            <div className="journey-card-header">
              <h3>What this route already covers</h3>
              <span className="dashboard-badge">Doctor shell</span>
            </div>
            <div className="action-chip-row">
              <span className="action-chip">Profile editing</span>
              <span className="action-chip">Schedule setup</span>
              <span className="action-chip">Verification uploads</span>
              <span className="action-chip">Prescription issuing</span>
            </div>
          </article>
        </div>
      ) : null}

      <div className="doctor-workbench-grid">
        <section className="doctor-panel">
          <div className="journey-card-header">
            <h3>Public profile</h3>
            <StatusPill status={profile ? 'ok' : 'pending'} label={profile ? 'Loaded' : 'New profile'} />
          </div>
          <form className="analysis-form" onSubmit={handleProfileSubmit}>
            <label>
              Name
              <input name="name" value={profileValues.name} onChange={handleProfileChange} />
            </label>
            <label>
              Specialization
              <input
                name="specialization"
                value={profileValues.specialization}
                onChange={handleProfileChange}
              />
            </label>
            <label>
              Consultation fee
              <input
                name="consultationFee"
                type="number"
                min="0"
                step="0.01"
                value={profileValues.consultationFee}
                onChange={handleProfileChange}
              />
            </label>
            <label>
              Bio
              <textarea name="bio" rows="4" value={profileValues.bio} onChange={handleProfileChange} />
            </label>
            <div className="form-actions">
              <button type="submit">Save profile</button>
            </div>
          </form>
        </section>

        <section className="doctor-panel">
          <div className="journey-card-header">
            <h3>Schedule manager</h3>
            <StatusPill
              status={schedule?.slots?.length ? 'ok' : 'pending'}
              label={schedule?.schedule_type || 'Not configured'}
            />
          </div>
          <div className="doctor-action-row">
            <button type="button" className="secondary-button" onClick={() => handleScheduleType('recurring')}>
              Recurring
            </button>
            <button type="button" className="secondary-button" onClick={() => handleScheduleType('reset')}>
              Reset weekly
            </button>
          </div>
          <form className="analysis-form" onSubmit={handleAddSlot}>
            <div className="mini-form-grid">
              <label>
                Day
                <select name="dayOfWeek" value={slotValues.dayOfWeek} onChange={handleSlotChange}>
                  {dayLabels.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input name="startTime" type="time" value={slotValues.startTime} onChange={handleSlotChange} />
              </label>
              <label>
                End
                <input name="endTime" type="time" value={slotValues.endTime} onChange={handleSlotChange} />
              </label>
            </div>
            <label>
              Week start
              <input name="weekStart" type="date" value={slotValues.weekStart} onChange={handleSlotChange} />
            </label>
            <div className="form-actions">
              <button type="submit">Add slot</button>
            </div>
          </form>

          <div className="dashboard-list">
            {(schedule?.slots || []).length ? (
              schedule.slots.map((slot) => (
                <article key={slot.id} className="dashboard-list-item">
                  <div className="doctor-slot-topline">
                    <strong>{dayLabels[slot.day_of_week] || `Day ${slot.day_of_week}`}</strong>
                    <StatusPill status={slot.is_available ? 'ok' : 'warn'} label={slot.is_available ? 'Available' : 'Unavailable'} />
                  </div>
                  <p>
                    {formatTime(slot.start_time)} to {formatTime(slot.end_time)}
                    {slot.week_start ? ` • week of ${slot.week_start}` : ''}
                  </p>
                  <div className="doctor-action-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleToggleSlot(slot.id, slot.is_available)}
                    >
                      {slot.is_available ? 'Mark unavailable' : 'Mark available'}
                    </button>
                    <button type="button" className="secondary-button" onClick={() => handleDeleteSlot(slot.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No doctor schedule slots yet.</p>
            )}
          </div>
        </section>

        <section className="doctor-panel">
          <div className="journey-card-header">
            <h3>Verification</h3>
            <StatusPill
              status={verification?.status === 'approved' ? 'ok' : verification ? 'warn' : 'pending'}
              label={verification?.status || 'Pending'}
            />
          </div>
          <p className="doctor-help">
            Documents submitted: {verification?.documentsSubmitted || 0} / {verification?.totalRequired || 4}
          </p>
          <form className="analysis-form" onSubmit={handleUploadDocument}>
            <label>
              Document type
              <select value={verificationValues.documentType} onChange={handleVerificationType}>
                <option value="license">License</option>
                <option value="government_id">Government ID</option>
                <option value="credentials">Credentials</option>
                <option value="insurance">Insurance</option>
              </select>
            </label>
            <label>
              PDF document
              <input type="file" accept="application/pdf,.pdf" onChange={handleVerificationFile} />
            </label>
            <div className="form-actions">
              <button type="submit">Upload document</button>
              <button type="button" className="secondary-button" onClick={handleSubmitVerification}>
                Submit for review
              </button>
            </div>
          </form>

          <div className="dashboard-list">
            {documents.length ? (
              documents.map((document) => (
                <article key={document.id} className="dashboard-list-item">
                  <strong>{document.fileName || document.documentType}</strong>
                  <p>{document.documentType} • {document.status || 'submitted'}</p>
                </article>
              ))
            ) : (
              <p className="empty-state">No verification documents uploaded yet.</p>
            )}
          </div>
        </section>

        <section className="doctor-panel">
          <div className="journey-card-header">
            <h3>Prescriptions</h3>
            <StatusPill status={prescriptions.length ? 'ok' : 'pending'} label={`${prescriptions.length} issued`} />
          </div>
          <form className="analysis-form" onSubmit={handleIssuePrescription}>
            <label>
              Patient ID
              <input name="patientId" value={prescriptionValues.patientId} onChange={handlePrescriptionChange} />
            </label>
            <label>
              Appointment ID
              <input name="appointmentId" value={prescriptionValues.appointmentId} onChange={handlePrescriptionChange} />
            </label>
            <label>
              Patient name
              <input name="patientName" value={prescriptionValues.patientName} onChange={handlePrescriptionChange} />
            </label>
            <label>
              Medications
              <textarea
                name="medications"
                rows="4"
                placeholder="One medication per line"
                value={prescriptionValues.medications}
                onChange={handlePrescriptionChange}
              />
            </label>
            <label>
              Notes
              <textarea name="notes" rows="3" value={prescriptionValues.notes} onChange={handlePrescriptionChange} />
            </label>
            <div className="form-actions">
              <button type="submit">Issue prescription</button>
            </div>
          </form>

          <div className="dashboard-list">
            {prescriptions.length ? (
              prescriptions.slice(0, 5).map((prescription) => (
                <article key={prescription.id} className="dashboard-list-item">
                  <strong>{prescription.patient_name || prescription.patient_id}</strong>
                  <p>{new Date(prescription.created_at).toLocaleString()}</p>
                </article>
              ))
            ) : (
              <p className="empty-state">No prescriptions issued yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
