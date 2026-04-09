import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../StatusPill'
import VideoRoom from '../VideoRoom'
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

const sidebarItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'patients', label: 'Patients' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'verification', label: 'Verification' },
  { id: 'profile', label: 'Profile' },
]

function formatTime(value) {
  if (!value) return 'Time not set'
  return String(value).slice(0, 5)
}

function getInitials(name) {
  return String(name || 'Doctor')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function DoctorDashboard({ session, onSignOut, onRequireLogin }) {
  const isConnectedDoctor = session?.role === 'doctor' && session?.mode === 'connected' && session?.token
  const doctorId = session?.userId

  const [activeSection, setActiveSection] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [verification, setVerification] = useState(null)
  const [documents, setDocuments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeCallSessionId, setActiveCallSessionId] = useState(null)
  const [joinSessionId, setJoinSessionId] = useState('')

  const [profileValues, setProfileValues] = useState({
    name: '',
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
    if (!isConnectedDoctor || !doctorId) return

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
      setProfileValues({
        name: nextProfile?.name || session?.name || '',
        specialization: nextProfile?.specialization || '',
        consultationFee: nextProfile?.consultation_fee ? String(nextProfile.consultation_fee) : '',
        bio: nextProfile?.bio || '',
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoctorWorkspace()
  }, [doctorId, isConnectedDoctor, session?.token])

  const patientCount = useMemo(() => {
    const uniquePatients = new Set(
      prescriptions.map((prescription) => prescription.patient_id || prescription.patient_name).filter(Boolean),
    )
    return uniquePatients.size
  }, [prescriptions])

  const availableSlots = useMemo(
    () => (schedule?.slots || []).filter((slot) => slot.is_available),
    [schedule?.slots],
  )

  const activeSectionLabel =
    sidebarItems.find((item) => item.id === activeSection)?.label || 'Overview'

  if (activeCallSessionId) {
    return (
      <VideoRoom
        sessionId={activeCallSessionId}
        peerName="Active Patient Consultation"
        onEndRedirect={() => setActiveCallSessionId(null)}
      />
    )
  }

  if (!isConnectedDoctor) {
    return (
      <div className="doctor-portal-guard">
        <div className="doctor-portal-guard-card">
          <p className="doctor-sidebar-kicker">Arogya Doctor Portal</p>
          <h2>Doctor login is required before the dashboard can open.</h2>
          <p>
            Use the shared login or registration page, choose the doctor role, and the app will
            redirect you into this dashboard automatically.
          </p>
          <div className="doctor-toolbar">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
            <button type="button" className="secondary-button" onClick={() => onRequireLogin('/register')}>
              Create account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const overviewCards = [
    {
      label: "Today's appointments",
      value: '0',
      detail: 'Appointment feed will connect next.',
    },
    {
      label: 'Total patients',
      value: String(patientCount),
      detail: patientCount ? 'Patients with prescription records.' : 'No patients yet.',
    },
    {
      label: 'Consultations',
      value: '0',
      detail: 'Teleconsultation workflow is still pending.',
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
    setError('')

    try {
      await toggleDoctorScheduleSlot(session.token, slotId, !isAvailable)
      await loadDoctorWorkspace()
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleDeleteSlot = async (slotId) => {
    setError('')

    try {
      await deleteDoctorScheduleSlot(session.token, slotId)
      await loadDoctorWorkspace()
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleVerificationType = (event) => {
    setVerificationValues((current) => ({ ...current, documentType: event.target.value }))
  }

  const handleVerificationFile = (event) => {
    const file = event.target.files?.[0] || null
    setVerificationValues((current) => ({ ...current, file }))
  }

  const handleUploadDocument = async (event) => {
    event.preventDefault()
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

  const renderOverview = () => (
    <div className="doctor-page-stack">
      <section className="doctor-welcome-panel">
        <h2>Welcome, Dr. {profile?.name || session?.name || 'Doctor'}</h2>
        <p>Here&apos;s a summary of your current doctor workspace and the integrations already live.</p>
      </section>

      <div className="doctor-metric-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className="doctor-metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="doctor-content-grid">
        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Workspace status</h3>
            <StatusPill
              status={verification?.status === 'approved' ? 'ok' : verification ? 'warn' : 'pending'}
              label={verification?.status || 'Pending'}
            />
          </div>
          <div className="doctor-detail-list">
            <div className="doctor-detail-row">
              <span>Available schedule slots</span>
              <strong>{availableSlots.length}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Uploaded documents</span>
              <strong>{documents.length}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Issued prescriptions</span>
              <strong>{prescriptions.length}</strong>
            </div>
          </div>
        </article>

        <article className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Quick actions</h3>
            <span className="doctor-mini-badge">Doctor tools</span>
          </div>
          <div className="doctor-chip-row">
            <span className="doctor-chip">Review appointments</span>
            <span className="doctor-chip">Update schedule</span>
            <span className="doctor-chip">Verify profile</span>
            <span className="doctor-chip">Issue prescription</span>
          </div>
        </article>
      </div>
    </div>
  )

  const renderAppointments = () => (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Appointments</h3>
          <span className="doctor-mini-badge">Upcoming integration</span>
        </div>
        <p>
          The final appointment feed will connect here from the appointment service. For now, your
          availability and booking readiness are driven by the schedule section.
        </p>
        <div className="doctor-detail-list">
          <div className="doctor-detail-row">
            <span>Schedule type</span>
            <strong>{schedule?.schedule_type || 'Not configured'}</strong>
          </div>
          <div className="doctor-detail-row">
            <span>Configured slots</span>
            <strong>{schedule?.slots?.length || 0}</strong>
          </div>
        </div>
      </section>
    </div>
  )

  const renderSchedule = () => (
    <div className="doctor-content-grid">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Schedule Setup</h3>
          <StatusPill
            status={schedule?.slots?.length ? 'ok' : 'pending'}
            label={schedule?.schedule_type || 'Not configured'}
          />
        </div>
        <p>Manage the time slots that patients will later book against.</p>
        <div className="doctor-toolbar">
          <button type="button" className="secondary-button" onClick={() => handleScheduleType('recurring')}>
            Set recurring
          </button>
          <button type="button" className="secondary-button" onClick={() => handleScheduleType('reset')}>
            Reset weekly
          </button>
        </div>
        <form className="analysis-form" onSubmit={handleAddSlot}>
          <div className="doctor-inline-grid">
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
          <div className="doctor-toolbar">
            <button type="submit">Add slot</button>
          </div>
        </form>
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Current Slots</h3>
          <span className="doctor-mini-badge">{schedule?.slots?.length || 0} slots</span>
        </div>
        <div className="doctor-list-stack">
          {(schedule?.slots || []).length ? (
            schedule.slots.map((slot) => (
              <article key={slot.id} className="doctor-list-card">
                <div className="doctor-card-topline">
                  <strong>{dayLabels[slot.day_of_week] || `Day ${slot.day_of_week}`}</strong>
                  <StatusPill
                    status={slot.is_available ? 'ok' : 'warn'}
                    label={slot.is_available ? 'Available' : 'Unavailable'}
                  />
                </div>
                <p>
                  {formatTime(slot.start_time)} to {formatTime(slot.end_time)}
                  {slot.week_start ? ` | week of ${slot.week_start}` : ''}
                </p>
                <div className="doctor-toolbar">
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
            <p className="empty-state">No schedule slots have been added yet.</p>
          )}
        </div>
      </section>
    </div>
  )

  const renderPatients = () => (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Patients</h3>
          <span className="doctor-mini-badge">{patientCount} tracked</span>
        </div>
        <div className="doctor-list-stack">
          {prescriptions.length ? (
            prescriptions.map((prescription) => (
              <article key={prescription.id} className="doctor-list-card">
                <strong>{prescription.patient_name || prescription.patient_id}</strong>
                <p>{new Date(prescription.created_at).toLocaleString()}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">Patient records will appear here after prescriptions are issued.</p>
          )}
        </div>
      </section>
    </div>
  )

  const renderConsultations = () => (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Consultations</h3>
          <span className="doctor-mini-badge">Telemedicine</span>
        </div>
        <p>
          Join an active telemedicine session using its session ID. This keeps the doctor workflow
          ready while the wider consultation flow is still evolving.
        </p>
        <form
          className="analysis-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (joinSessionId) {
              setActiveCallSessionId(joinSessionId)
            }
          }}
        >
          <label>
            Session ID
            <input
              name="sessionId"
              value={joinSessionId}
              onChange={(event) => setJoinSessionId(event.target.value)}
              placeholder="e.g. session-786"
              required
            />
          </label>
          <div className="doctor-toolbar">
            <button type="submit" disabled={!isConnectedDoctor || !joinSessionId}>
              Join video call
            </button>
          </div>
        </form>
      </section>
    </div>
  )

  const renderPrescriptions = () => (
    <div className="doctor-content-grid">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Issue Prescription</h3>
          <span className="doctor-mini-badge">Prescriptions</span>
        </div>
        <form className="analysis-form" onSubmit={handleIssuePrescription}>
          <label>
            Patient ID
            <input name="patientId" value={prescriptionValues.patientId} onChange={handlePrescriptionChange} />
          </label>
          <label>
            Appointment ID
            <input
              name="appointmentId"
              value={prescriptionValues.appointmentId}
              onChange={handlePrescriptionChange}
            />
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
          <div className="doctor-toolbar">
            <button type="submit">Issue prescription</button>
          </div>
        </form>
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Issued Prescriptions</h3>
          <span className="doctor-mini-badge">{prescriptions.length} records</span>
        </div>
        <div className="doctor-list-stack">
          {prescriptions.length ? (
            prescriptions.map((prescription) => (
              <article key={prescription.id} className="doctor-list-card">
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
  )

  const renderVerification = () => (
    <div className="doctor-content-grid">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Verification Status</h3>
          <StatusPill
            status={verification?.status === 'approved' ? 'ok' : verification ? 'warn' : 'pending'}
            label={verification?.status || 'Pending'}
          />
        </div>
        <div className="doctor-detail-list">
          <div className="doctor-detail-row">
            <span>Submitted documents</span>
            <strong>{verification?.documentsSubmitted || 0}</strong>
          </div>
          <div className="doctor-detail-row">
            <span>Required total</span>
            <strong>{verification?.totalRequired || 4}</strong>
          </div>
        </div>

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
          <div className="doctor-toolbar">
            <button type="submit">Upload document</button>
            <button type="button" className="secondary-button" onClick={handleSubmitVerification}>
              Submit for review
            </button>
          </div>
        </form>
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Uploaded Documents</h3>
          <span className="doctor-mini-badge">{documents.length} files</span>
        </div>
        <div className="doctor-list-stack">
          {documents.length ? (
            documents.map((document) => (
              <article key={document.id} className="doctor-list-card">
                <strong>{document.fileName || document.documentType}</strong>
                <p>{document.documentType} | {document.status || 'submitted'}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No verification documents uploaded yet.</p>
          )}
        </div>
      </section>
    </div>
  )

  const renderProfile = () => (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Profile</h3>
          <StatusPill status={profile ? 'ok' : 'pending'} label={profile ? 'Loaded' : 'New profile'} />
        </div>
        <form className="analysis-form" onSubmit={handleProfileSubmit}>
          <label>
            Name
            <input name="name" value={profileValues.name} onChange={handleProfileChange} />
          </label>
          <label>
            Specialization
            <input name="specialization" value={profileValues.specialization} onChange={handleProfileChange} />
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
          <div className="doctor-toolbar">
            <button type="submit">Save profile</button>
          </div>
        </form>
      </section>
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'appointments':
        return renderAppointments()
      case 'schedule':
        return renderSchedule()
      case 'patients':
        return renderPatients()
      case 'consultations':
        return renderConsultations()
      case 'prescriptions':
        return renderPrescriptions()
      case 'verification':
        return renderVerification()
      case 'profile':
        return renderProfile()
      case 'overview':
      default:
        return renderOverview()
    }
  }

  return (
    <div className="doctor-portal">
      <aside className="doctor-portal-sidebar">
        <div className="doctor-portal-brand">
          <div className="doctor-brand-mark">AR</div>
          <div>
            <strong>Arogya</strong>
            <span>Doctor Workspace</span>
          </div>
        </div>

        <nav className="doctor-portal-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`doctor-portal-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="doctor-portal-footer">
          <div className="doctor-portal-user">
            <div className="doctor-avatar">{getInitials(profile?.name || session?.name)}</div>
            <div>
              <strong>Dr. {profile?.name || session?.name || 'Doctor'}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
          <button type="button" className="doctor-signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="doctor-portal-main">
        <header className="doctor-portal-header">
          <div>
            <p className="doctor-portal-section-label">{activeSectionLabel}</p>
            <h1>{activeSectionLabel}</h1>
          </div>
          <div className="doctor-portal-header-user">
            <div className="doctor-avatar small">{getInitials(profile?.name || session?.name)}</div>
            <div>
              <strong>Dr. {profile?.name || session?.name || 'Doctor'}</strong>
              <span>{profile?.specialization || 'Doctor account'}</span>
            </div>
          </div>
        </header>

        {loading ? <p className="empty-state">Loading doctor dashboard...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="doctor-success">{message}</p> : null}

        {renderActiveSection()}
      </section>
      </div>
  )
}
