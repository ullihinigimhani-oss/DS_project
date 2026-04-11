import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  approveDoctorAppointment,
  fetchDoctorAppointments,
  rejectDoctorAppointment,
} from '../../utils/appointmentService'
import {
  addDoctorScheduleSlot,
  deleteDoctorScheduleSlot,
  fetchDoctorDocuments,
  fetchDoctorPrescriptions,
  fetchDoctorProfile,
  fetchDoctorSchedule,
  fetchDoctorVerificationStatus,
  issueDoctorPrescription,
  resetDoctorScheduleWeek,
  setDoctorScheduleType,
  submitDoctorVerification,
  toggleDoctorScheduleSlot,
  updateDoctorProfile,
  uploadDoctorDocument,
} from '../../utils/doctorService'

const DoctorPortalContext = createContext(null)
const prescriptionDraftKey = 'doctor-prescription-draft'
const consultationDraftKey = 'doctor-consultation-draft'

export const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const sidebarItems = [
  { id: 'overview', label: 'Overview', path: '/doctor/dashboard' },
  { id: 'appointments', label: 'Appointments', path: '/doctor/appointments' },
  { id: 'schedule', label: 'Schedule', path: '/doctor/schedule' },
  { id: 'patients', label: 'Patients', path: '/doctor/patients' },
  { id: 'consultations', label: 'Consultations', path: '/doctor/consultations' },
  { id: 'prescriptions', label: 'Prescriptions', path: '/doctor/prescriptions' },
  { id: 'verification', label: 'Verification', path: '/doctor/verification' },
  { id: 'profile', label: 'Profile', path: '/doctor/profile' },
]

export const appointmentFilters = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
]

function readStoredJson(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStoredJson(key, value) {
  window.sessionStorage.setItem(key, JSON.stringify(value))
}

function removeStoredJson(key) {
  window.sessionStorage.removeItem(key)
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'))
    reader.readAsDataURL(file)
  })
}

export function formatTime(value) {
  if (!value) return 'Time not set'
  return String(value).slice(0, 5)
}

export function formatDate(value) {
  if (!value) return 'Date not set'

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getAppointmentTimestamp(appointment) {
  if (!appointment?.appointment_date) return Number.POSITIVE_INFINITY

  const time = String(appointment?.start_time || '00:00').slice(0, 5)
  return new Date(`${appointment.appointment_date}T${time}:00`).getTime()
}

export function getMondayString(date = new Date()) {
  const working = new Date(date)
  const day = working.getDay()
  const diff = working.getDate() - day + (day === 0 ? -6 : 1)
  working.setDate(diff)
  working.setHours(0, 0, 0, 0)
  return working.toISOString().split('T')[0]
}

export function formatScheduleType(type) {
  if (type === 'reset') return 'Weekly reset'
  if (type === 'recurring') return 'Recurring'
  return 'Not configured'
}

export function getAppointmentStatusTone(status) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'pending'
  return 'warn'
}

export function getInitials(name) {
  return String(name || 'Doctor')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function useDoctorPortal() {
  const value = useContext(DoctorPortalContext)

  if (!value) {
    throw new Error('useDoctorPortal must be used inside DoctorPortalProvider')
  }

  return value
}

export function DoctorPortalProvider({ session, children }) {
  const isConnectedDoctor = session?.role === 'doctor' && session?.mode === 'connected' && session?.token
  const doctorId = session?.userId
  const storedPrescriptionDraft = readStoredJson(prescriptionDraftKey, null)
  const storedConsultationDraft = readStoredJson(consultationDraftKey, null)

  const [profile, setProfile] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [verification, setVerification] = useState(null)
  const [documents, setDocuments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [appointmentLoading, setAppointmentLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeCallSessionId, setActiveCallSessionId] = useState(null)
  const [joinSessionId, setJoinSessionId] = useState(storedConsultationDraft?.sessionId || '')
  const [appointmentFilter, setAppointmentFilter] = useState('all')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [appointmentActionId, setAppointmentActionId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState('')

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
    weekStart: getMondayString(),
  })

  const [verificationValues, setVerificationValues] = useState({
    documentType: 'license',
    file: null,
  })

  const [prescriptionValues, setPrescriptionValues] = useState({
    patientId: storedPrescriptionDraft?.patientId || '',
    appointmentId: storedPrescriptionDraft?.appointmentId || '',
    patientName: storedPrescriptionDraft?.patientName || '',
    medications: storedPrescriptionDraft?.medications || '',
    notes: storedPrescriptionDraft?.notes || '',
  })

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreview('')
      return undefined
    }

    const nextPreview = window.URL.createObjectURL(profileImageFile)
    setProfileImagePreview(nextPreview)

    return () => {
      window.URL.revokeObjectURL(nextPreview)
    }
  }, [profileImageFile])

  const buildProfileValues = (nextProfile) => ({
    name: nextProfile?.name || session?.name || '',
    specialization: nextProfile?.specialization || '',
    consultationFee:
      nextProfile?.consultation_fee != null ? String(nextProfile.consultation_fee) : '',
    bio: nextProfile?.bio || '',
  })

  useEffect(() => {
    const draft = {
      patientId: prescriptionValues.patientId,
      appointmentId: prescriptionValues.appointmentId,
      patientName: prescriptionValues.patientName,
      medications: prescriptionValues.medications,
      notes: prescriptionValues.notes,
    }

    if (
      draft.patientId ||
      draft.appointmentId ||
      draft.patientName ||
      draft.medications ||
      draft.notes
    ) {
      writeStoredJson(prescriptionDraftKey, draft)
    } else {
      removeStoredJson(prescriptionDraftKey)
    }
  }, [
    prescriptionValues.appointmentId,
    prescriptionValues.medications,
    prescriptionValues.notes,
    prescriptionValues.patientId,
    prescriptionValues.patientName,
  ])

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
      setProfileValues(buildProfileValues(nextProfile))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async () => {
    if (!isConnectedDoctor || !doctorId) return

    setAppointmentLoading(true)

    try {
      const appointmentData = await fetchDoctorAppointments(session.token)
      const nextAppointments = Array.isArray(appointmentData.data) ? appointmentData.data : []

      setAppointments(nextAppointments)
      setSelectedAppointmentId((current) =>
        nextAppointments.some((appointment) => appointment.id === current)
          ? current
          : nextAppointments[0]?.id || '',
      )
    } catch (loadError) {
      setAppointments([])
      setSelectedAppointmentId('')
      setError(loadError.message)
    } finally {
      setAppointmentLoading(false)
    }
  }

  useEffect(() => {
    loadDoctorWorkspace()
    loadAppointments()
  }, [doctorId, isConnectedDoctor, session?.token])

  const patientCount = useMemo(() => {
    const uniquePatients = new Set(
      [
        ...appointments.map((appointment) => appointment.patient_id || appointment.patient_name),
        ...prescriptions.map((prescription) => prescription.patient_id || prescription.patient_name),
      ].filter(Boolean),
    )
    return uniquePatients.size
  }, [appointments, prescriptions])

  const availableSlots = useMemo(
    () => (schedule?.slots || []).filter((slot) => slot.is_available),
    [schedule?.slots],
  )

  const sortedScheduleSlots = useMemo(
    () =>
      [...(schedule?.slots || [])].sort((left, right) => {
        if (left.day_of_week !== right.day_of_week) {
          return left.day_of_week - right.day_of_week
        }

        return String(left.start_time).localeCompare(String(right.start_time))
      }),
    [schedule?.slots],
  )

  const scheduleSummary = useMemo(
    () => ({
      total: sortedScheduleSlots.length,
      available: sortedScheduleSlots.filter((slot) => slot.is_available).length,
      unavailable: sortedScheduleSlots.filter((slot) => !slot.is_available).length,
      oneOff: sortedScheduleSlots.filter((slot) => slot.week_start).length,
    }),
    [sortedScheduleSlots],
  )

  const scheduleByDay = useMemo(
    () =>
      dayLabels.map((label, index) => ({
        label,
        slots: sortedScheduleSlots.filter((slot) => Number(slot.day_of_week) === index),
      })),
    [sortedScheduleSlots],
  )

  const appointmentSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    return {
      today: appointments.filter((appointment) => appointment.appointment_date === today).length,
      pending: appointments.filter((appointment) => appointment.status === 'pending').length,
      confirmed: appointments.filter((appointment) => appointment.status === 'confirmed').length,
      telemedicine: appointments.filter(
        (appointment) => appointment.is_telemedicine && appointment.status === 'confirmed',
      ).length,
    }
  }, [appointments])

  const sortedAppointments = useMemo(
    () => [...appointments].sort((left, right) => getAppointmentTimestamp(left) - getAppointmentTimestamp(right)),
    [appointments],
  )

  const filteredAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    switch (appointmentFilter) {
      case 'today':
        return sortedAppointments.filter((appointment) => appointment.appointment_date === today)
      case 'upcoming':
        return sortedAppointments.filter((appointment) => appointment.appointment_date >= today)
      case 'pending':
        return sortedAppointments.filter((appointment) => appointment.status === 'pending')
      case 'confirmed':
        return sortedAppointments.filter((appointment) => appointment.status === 'confirmed')
      case 'all':
      default:
        return sortedAppointments
    }
  }, [appointmentFilter, sortedAppointments])

  const nextPendingAppointment = useMemo(
    () => sortedAppointments.find((appointment) => appointment.status === 'pending') || null,
    [sortedAppointments],
  )

  const nextConfirmedAppointment = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return (
      sortedAppointments.find(
        (appointment) =>
          appointment.status === 'confirmed' && appointment.appointment_date >= today,
      ) || null
    )
  }, [sortedAppointments])

  const selectedAppointment =
    filteredAppointments.find((appointment) => appointment.id === selectedAppointmentId) ||
    appointments.find((appointment) => appointment.id === selectedAppointmentId) ||
    null

  useEffect(() => {
    if (filteredAppointments.length === 0) {
      if (selectedAppointmentId) {
        setSelectedAppointmentId('')
      }
      return
    }

    if (!filteredAppointments.some((appointment) => appointment.id === selectedAppointmentId)) {
      setSelectedAppointmentId(filteredAppointments[0].id)
    }
  }, [filteredAppointments, selectedAppointmentId])

  const overviewCards = useMemo(
    () => [
      {
        label: "Today's appointments",
        value: String(appointmentSummary.today),
        detail: appointmentSummary.pending
          ? `${appointmentSummary.pending} waiting for your response.`
          : 'No pending actions right now.',
      },
      {
        label: 'Total patients',
        value: String(patientCount),
        detail: patientCount ? 'Unique patients across appointments and prescriptions.' : 'No patients yet.',
      },
      {
        label: 'Consultations',
        value: String(appointmentSummary.telemedicine),
        detail: appointmentSummary.telemedicine
          ? 'Confirmed telemedicine sessions are ready.'
          : 'No confirmed telemedicine sessions yet.',
      },
    ],
    [appointmentSummary.pending, appointmentSummary.telemedicine, appointmentSummary.today, patientCount],
  )

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileValues((current) => ({ ...current, [name]: value }))
  }

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null

    if (file && !file.type.startsWith('image/')) {
      setError('Please choose an image file for the doctor profile photo.')
      return
    }

    setError('')
    setProfileImageFile(file)
  }

  const clearProfileImageSelection = () => {
    setProfileImageFile(null)
  }

  const resetProfileForm = () => {
    setProfileValues(buildProfileValues(profile))
    setProfileImageFile(null)
    setProfileEditing(false)
    setError('')
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
      const result = await updateDoctorProfile(session.token, {
        ...profileValues,
        consultationFee:
          profileValues.consultationFee === '' ? null : Number(profileValues.consultationFee),
        profileImageData: profileImageFile ? await fileToDataUrl(profileImageFile) : undefined,
        profileImageName: profileImageFile ? profileImageFile.name : undefined,
      })
      setProfile(result.data)
      setProfileValues(buildProfileValues(result.data))
      setProfileImageFile(null)
      setProfileEditing(false)
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
    setMessage('')

    try {
      await toggleDoctorScheduleSlot(session.token, slotId, !isAvailable)
      await loadDoctorWorkspace()
      setMessage(`Slot marked ${isAvailable ? 'unavailable' : 'available'}.`)
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleDeleteSlot = async (slotId) => {
    setError('')
    setMessage('')

    try {
      await deleteDoctorScheduleSlot(session.token, slotId)
      await loadDoctorWorkspace()
      setMessage('Schedule slot deleted.')
    } catch (slotError) {
      setError(slotError.message)
    }
  }

  const handleResetWeek = async () => {
    if (!slotValues.weekStart) {
      setError('Choose a week start before clearing reset-week slots.')
      return
    }

    setMessage('')
    setError('')

    try {
      await resetDoctorScheduleWeek(session.token, slotValues.weekStart)
      await loadDoctorWorkspace()
      setMessage(`Weekly reset slots cleared for the week of ${slotValues.weekStart}.`)
    } catch (resetError) {
      setError(resetError.message)
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
      removeStoredJson(prescriptionDraftKey)
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

  const handleApproveAppointment = async (appointmentId) => {
    setMessage('')
    setError('')
    setAppointmentActionId(appointmentId)

    try {
      await approveDoctorAppointment(session.token, appointmentId)
      await loadAppointments()
      setMessage('Appointment approved successfully.')
    } catch (appointmentError) {
      setError(appointmentError.message)
    } finally {
      setAppointmentActionId('')
    }
  }

  const handleRejectAppointment = async (appointmentId) => {
    setMessage('')
    setError('')
    setAppointmentActionId(appointmentId)

    try {
      await rejectDoctorAppointment(session.token, appointmentId, rejectReason)
      setRejectReason('')
      await loadAppointments()
      setMessage('Appointment request rejected.')
    } catch (appointmentError) {
      setError(appointmentError.message)
    } finally {
      setAppointmentActionId('')
    }
  }

  const preparePrescriptionDraft = (appointment) => {
    const nextDraft = {
      patientId: appointment.patient_id || '',
      appointmentId: appointment.id || '',
      patientName: appointment.patient_name || '',
    }

    writeStoredJson(prescriptionDraftKey, nextDraft)
    setPrescriptionValues((current) => ({ ...current, ...nextDraft }))
  }

  const prepareConsultationDraft = (appointment) => {
    const nextSessionId =
      appointment.telemedicine_session_id || appointment.session_id || appointment.room_id || ''

    if (!nextSessionId) return ''

    writeStoredJson(consultationDraftKey, { sessionId: nextSessionId })
    setJoinSessionId(nextSessionId)
    return nextSessionId
  }

  const value = {
    session,
    doctorId,
    isConnectedDoctor,
    profile,
    schedule,
    verification,
    documents,
    prescriptions,
    appointments,
    loading,
    appointmentLoading,
    error,
    message,
    activeCallSessionId,
    joinSessionId,
    appointmentFilter,
    selectedAppointmentId,
    appointmentActionId,
    rejectReason,
    profileEditing,
    profileImageFile,
    profileImagePreview,
    profileValues,
    slotValues,
    verificationValues,
    prescriptionValues,
    setPrescriptionValues,
    patientCount,
    availableSlots,
    sortedScheduleSlots,
    scheduleSummary,
    scheduleByDay,
    appointmentSummary,
    filteredAppointments,
    nextPendingAppointment,
    nextConfirmedAppointment,
    selectedAppointment,
    overviewCards,
    setError,
    setMessage,
    setActiveCallSessionId,
    setJoinSessionId,
    setAppointmentFilter,
    setSelectedAppointmentId,
    setRejectReason,
    setProfileEditing,
    handleProfileChange,
    handleProfileImageChange,
    handleSlotChange,
    handlePrescriptionChange,
    handleProfileSubmit,
    clearProfileImageSelection,
    resetProfileForm,
    handleScheduleType,
    handleAddSlot,
    handleToggleSlot,
    handleDeleteSlot,
    handleResetWeek,
    handleVerificationType,
    handleVerificationFile,
    handleUploadDocument,
    handleSubmitVerification,
    handleIssuePrescription,
    handleApproveAppointment,
    handleRejectAppointment,
    preparePrescriptionDraft,
    prepareConsultationDraft,
  }

  return <DoctorPortalContext.Provider value={value}>{children}</DoctorPortalContext.Provider>
}
