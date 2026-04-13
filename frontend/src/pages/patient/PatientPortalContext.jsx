import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  cancelPatientBooking,
  confirmPatientBookingPayment,
  createPatientBooking,
  fetchDoctorAvailability,
  fetchPatientBookings,
} from '../../utils/appointmentService'
import { confirmStripePayment, createStripePayment } from '../../utils/paymentService'

const PatientPortalContext = createContext(null)
const patientPortalStateStorageKey = 'patient-portal-state'
const authTokenStorageKey = 'token'

function resolveSessionToken(session) {
  if (session?.token) return session.token
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(authTokenStorageKey) || ''
}

export const patientSidebarItems = [
  { id: 'overview', label: 'Overview', path: '/patient' },
  { id: 'book', label: 'Book Appointment', path: '/patient/book-appointment' },
  { id: 'payment', label: 'Payment', path: '/patient/payment' },
  { id: 'bookings', label: 'My Bookings', path: '/patient/my-bookings' },
  { id: 'prescriptions', label: 'My Prescriptions', path: '/patient/prescriptions' },
  { id: 'doctors', label: 'Doctors', path: '/patient/doctors' },
  { id: 'consultations', label: 'Join Consultation', path: '/patient/consultations' },
  { id: 'symptoms', label: 'Symptom History', path: '/patient/symptom-history' },
  { id: 'notifications', label: 'Notifications', path: '/patient/notifications' },
  { id: 'profile', label: 'Profile', path: '/patient/profile' },
]

export function getMondayString(baseDate = new Date()) {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().split('T')[0]
}

export function formatDate(value) {
  if (!value) return 'Date not set'

  const normalized = String(value).trim()
  const parsed = normalized.includes('T')
    ? new Date(normalized)
    : /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? new Date(`${normalized}T00:00:00`)
      : new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date not set'
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(value) {
  if (!value) return 'Time not set'
  return String(value).slice(0, 5)
}

export function getBookingTone(status) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'pending'
  return 'warn'
}

export function getInitials(name) {
  return String(name || 'Patient')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function readPersistedPortalState(userId) {
  if (!userId || typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.sessionStorage.getItem(patientPortalStateStorageKey)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (parsed?.userId !== userId) {
      return {}
    }

    return parsed.state || {}
  } catch {
    return {}
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSpecialistKeywords(specialist) {
  const normalized = normalizeText(specialist)

  if (!normalized) {
    return ['general']
  }

  if (
    normalized.includes('general physician') ||
    normalized.includes('general practitioner') ||
    normalized.includes('general practice')
  ) {
    return ['general']
  }

  if (normalized.includes('cardiolog')) return ['cardio']
  if (normalized.includes('pulmonolog')) return ['pulmo', 'respir']
  if (normalized.includes('neurolog')) return ['neuro']
  if (normalized.includes('gastro')) return ['gastro']
  if (normalized.includes('dermatolog')) return ['derma', 'skin']
  if (normalized.includes('ent')) return ['ent', 'ear', 'nose', 'throat']

  return normalized.split(' ').filter(Boolean)
}

function doctorMatchesSpecialist(doctor, specialist) {
  const specialization = normalizeText(doctor?.specialization)
  const keywords = buildSpecialistKeywords(specialist)

  if (!specialization) {
    return keywords.includes('general')
  }

  return keywords.some((keyword) => specialization.includes(keyword))
}

function buildBookingReason({ analysis, topCondition, symptoms, recommendedSpecialist, carePriority }) {
  const summary = topCondition?.name || 'Needs more clinical review'
  const detectedSymptoms = Array.isArray(analysis?.detectedSymptoms)
    ? analysis.detectedSymptoms.join(', ')
    : ''
  const symptomNarrative = symptoms?.trim() || detectedSymptoms

  return [
    `AI symptom checker summary: ${summary}.`,
    `Recommended specialist: ${recommendedSpecialist}.`,
    `Care priority: ${carePriority}.`,
    symptomNarrative ? `Reported symptoms: ${symptomNarrative}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function usePatientPortal() {
  const value = useContext(PatientPortalContext)

  if (!value) {
    throw new Error('usePatientPortal must be used inside PatientPortalProvider')
  }

  return value
}

export function PatientPortalProvider({
  activeRole,
  session,
  history,
  doctorDirectory,
  gatewayHealth,
  topCondition,
  children,
}) {
  const persistedState = readPersistedPortalState(session?.userId)
  const isConnectedPatient =
    activeRole === 'patient' &&
    session?.role === 'patient' &&
    session?.mode === 'connected' &&
    session?.token

  const [selectedDoctorId, setSelectedDoctorId] = useState(persistedState.selectedDoctorId || '')
  const [weekStart, setWeekStart] = useState(persistedState.weekStart || getMondayString())
  const [doctorFilterQuery, setDoctorFilterQuery] = useState('')
  const [availability, setAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingBusyId, setBookingBusyId] = useState('')
  const [reason, setReason] = useState(persistedState.reason || '')
  const [patientNameInput, setPatientNameInput] = useState(
    persistedState.patientNameInput || session?.name || '',
  )
  const [patientPhoneInput, setPatientPhoneInput] = useState(
    persistedState.patientPhoneInput || session?.phone || '',
  )
  const [isDifferentPatient, setIsDifferentPatient] = useState(Boolean(persistedState.isDifferentPatient))
  const [isTelemedicine, setIsTelemedicine] = useState(Boolean(persistedState.isTelemedicine))
  const [bookingDraft, setBookingDraft] = useState(persistedState.bookingDraft || null)
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(
    persistedState.pendingPaymentBooking || null,
  )

  const verifiedDoctors = useMemo(
    () => doctorDirectory.filter((doctor) => doctor.verification_status === 'approved'),
    [doctorDirectory],
  )

  useEffect(() => {
    const doctorStillSelected = verifiedDoctors.some((doctor) => doctor.doctor_id === selectedDoctorId)

    if (!doctorStillSelected) {
      setSelectedDoctorId(verifiedDoctors[0]?.doctor_id || '')
    }
  }, [selectedDoctorId, verifiedDoctors])

  useEffect(() => {
    if (!session?.userId || typeof window === 'undefined') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(patientPortalStateStorageKey)
      }
      return
    }

    window.sessionStorage.setItem(
      patientPortalStateStorageKey,
      JSON.stringify({
        userId: session.userId,
        state: {
          selectedDoctorId,
          weekStart,
          reason,
          patientNameInput,
          patientPhoneInput,
          isDifferentPatient,
          isTelemedicine,
          bookingDraft,
          pendingPaymentBooking,
        },
      }),
    )
  }, [
    bookingDraft,
    isDifferentPatient,
    isTelemedicine,
    patientNameInput,
    patientPhoneInput,
    pendingPaymentBooking,
    reason,
    selectedDoctorId,
    session?.userId,
    weekStart,
  ])

  useEffect(() => {
    if (!patientNameInput && session?.name) {
      setPatientNameInput(session.name)
    }
    if (!patientPhoneInput && session?.phone) {
      setPatientPhoneInput(session.phone)
    }
  }, [session?.name, session?.phone])

  const loadBookings = async () => {
    if (!isConnectedPatient) {
      setBookings([])
      return
    }

    setBookingsLoading(true)
    try {
      const data = await fetchPatientBookings(session.token)
      const rawBookings = Array.isArray(data.data) ? data.data : []
      const normalizedBookings = rawBookings.map((booking) => ({
        ...booking,
        payment_status: booking.payment_status || 'unpaid',
        payment_label: booking.payment_label || ((booking.payment_status || 'unpaid') === 'paid' ? 'paid' : 'unpaid'),
      }))
      setBookings(normalizedBookings)
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
  const filteredVerifiedDoctors = useMemo(() => {
    const query = String(doctorFilterQuery || '').toLowerCase().trim()
    if (!query) return verifiedDoctors

    return verifiedDoctors.filter((doctor) => {
      const name = String(doctor.name || '').toLowerCase()
      const specialization = String(doctor.specialization || 'General Practice').toLowerCase()
      return name.includes(query) || specialization.includes(query)
    })
  }, [doctorFilterQuery, verifiedDoctors])

  const selectedDoctor =
    filteredVerifiedDoctors.find((doctor) => doctor.doctor_id === selectedDoctorId) ||
    verifiedDoctors.find((doctor) => doctor.doctor_id === selectedDoctorId) ||
    null
  const availableSlots = availability.filter((slot) => !slot.isBooked)
  const suggestedDoctor =
    verifiedDoctors.find((doctor) => doctor.doctor_id === bookingDraft?.matchedDoctorId) || null

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

  const clearBookingDraft = () => {
    setBookingDraft(null)
    setReason('')
    setBookingMessage('')
  }

  const prepareBookingFromAnalysis = ({ analysis: nextAnalysis, topCondition: nextTopCondition, symptoms: nextSymptoms }) => {
    const recommendedSpecialist =
      nextAnalysis?.recommendedSpecialist ||
      nextAnalysis?.primaryModel?.recommendedSpecialist ||
      'General Physician'
    const carePriority =
      nextAnalysis?.consultationAdvice?.level || nextAnalysis?.severity || 'routine'
    const matchedDoctor = verifiedDoctors.find((doctor) =>
      doctorMatchesSpecialist(doctor, recommendedSpecialist),
    )
    const nextReason = buildBookingReason({
      analysis: nextAnalysis,
      topCondition: nextTopCondition,
      symptoms: nextSymptoms,
      recommendedSpecialist,
      carePriority,
    })

    setSelectedDoctorId(matchedDoctor?.doctor_id || verifiedDoctors[0]?.doctor_id || '')
    setReason(nextReason)
    setIsTelemedicine(false)
    setWeekStart(getMondayString())
    setBookingError('')
    setBookingMessage('Appointment booking was prefilled from your latest symptom guidance.')
    setBookingDraft({
      source: nextAnalysis?.source || 'analysis',
      topConditionName: nextTopCondition?.name || 'Needs more clinical review',
      recommendedSpecialist,
      carePriority,
      matchedDoctorId: matchedDoctor?.doctor_id || null,
      matchedDoctorName: matchedDoctor?.name || '',
      symptomSummary: nextReason,
    })
  }

  const handleCreateBooking = async (slot) => {
    if (!isConnectedPatient || !selectedDoctor) {
      setBookingError('Sign in as a patient to create a real booking.')
      return false
    }

    if (!reason.trim() || !patientNameInput.trim() || !patientPhoneInput.trim()) {
      setBookingError('Reason, patient name, and patient phone are required before booking.')
      return false
    }

    const slotKey = slot.id || `${slot.appointmentDate}-${slot.start_time}`

    setBookingBusyId(slotKey)
    setBookingError('')
    setBookingMessage('')

    try {
      const createdBooking = await createPatientBooking(session.token, {
        doctorId: selectedDoctor.doctor_id,
        slotId: slot.id || undefined,
        appointmentDate: slot.appointmentDate,
        startTime: slot.start_time,
        endTime: slot.end_time,
        reason: reason.trim(),
        doctorName: selectedDoctor.name || 'Doctor',
        patientName: patientNameInput.trim(),
        patientPhone: patientPhoneInput.trim(),
        isTelemedicine,
      })

      setPendingPaymentBooking({
        appointmentId: createdBooking?.data?.id,
        doctorId: selectedDoctor.doctor_id,
        doctorName: selectedDoctor.name || 'Doctor',
        amount: Number(selectedDoctor.consultation_fee || 0),
        startTime: slot.start_time,
        endTime: slot.end_time,
        appointmentDate: slot.appointmentDate,
        reason: reason.trim(),
        patientName: patientNameInput.trim(),
        patientPhone: patientPhoneInput.trim(),
        isTelemedicine,
      })
      setReason('')
      setIsTelemedicine(false)
      setBookingDraft(null)
      await Promise.all([loadBookings(), loadAvailability()])
      setBookingMessage('Appointment created. Complete payment to send it to doctor queue.')
      return createdBooking?.data || null
    } catch (error) {
      setBookingError(error.message)
      return false
    } finally {
      setBookingBusyId('')
    }
  }

  const handleCreatePaymentIntent = async () => {
    if (!isConnectedPatient || !pendingPaymentBooking?.appointmentId) {
      throw new Error('No pending booking found for payment.')
    }
    const token = resolveSessionToken(session)
    if (!token) {
      throw new Error('Patient session missing. Please login again and retry payment.')
    }

    if (!pendingPaymentBooking.amount || Number(pendingPaymentBooking.amount) <= 0) {
      throw new Error('Doctor consultation fee is not available for this booking.')
    }

    const payment = await createStripePayment(token, {
      amount: Number(pendingPaymentBooking.amount),
      slot_id: pendingPaymentBooking.appointmentId,
      patient_id: session?.userId || session?.id || undefined,
    })

    return payment?.data || {}
  }

  const handleConfirmPaymentAndBooking = async ({ paymentId, transactionId }) => {
    if (!isConnectedPatient || !pendingPaymentBooking?.appointmentId) {
      throw new Error('No pending booking found for payment confirmation.')
    }
    const token = resolveSessionToken(session)
    if (!token) {
      throw new Error('Patient session missing. Please login again and retry payment.')
    }

    if (paymentId) {
      await confirmStripePayment(token, paymentId, transactionId)
    }

    await confirmPatientBookingPayment(token, pendingPaymentBooking.appointmentId)
    setPendingPaymentBooking(null)
    await Promise.all([loadBookings(), loadAvailability()])
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
  }

  const preparePendingPaymentFromBooking = (booking) => {
    if (!booking?.id) return
    const doctorForFee = verifiedDoctors.find((doctor) => doctor.doctor_id === booking.doctor_id)
    setPendingPaymentBooking({
      appointmentId: booking.id,
      doctorId: booking.doctor_id,
      doctorName: booking.doctor_name || doctorForFee?.name || 'Doctor',
      amount: Number(doctorForFee?.consultation_fee || selectedDoctor?.consultation_fee || 0),
      startTime: booking.start_time,
      endTime: booking.end_time,
      appointmentDate: booking.appointment_date,
      reason: booking.reason || '',
      patientName: booking.patient_name || patientNameInput || '',
      patientPhone: booking.patient_phone || patientPhoneInput || '',
      isTelemedicine: Boolean(booking.is_telemedicine),
      paymentStatus: booking.payment_status || 'UNPAID',
    })
    setBookingMessage('Payment details loaded from your booking.')
  }

  const value = {
    activeRole,
    session,
    history,
    doctorDirectory,
    gatewayHealth,
    topCondition,
    isConnectedPatient,
    selectedDoctorId,
    weekStart,
    doctorFilterQuery,
    availability,
    availabilityLoading,
    bookings,
    bookingsLoading,
    bookingError,
    bookingMessage,
    bookingBusyId,
    reason,
    patientNameInput,
    patientPhoneInput,
    isDifferentPatient,
    isTelemedicine,
    bookingDraft,
    verifiedDoctors,
    recentHistory,
    selectedDoctor,
    suggestedDoctor,
    availableSlots,
    filteredVerifiedDoctors,
    pendingPaymentBooking,
    bookingSummary,
    patientMetrics,
    setSelectedDoctorId,
    setWeekStart,
    setDoctorFilterQuery,
    setReason,
    setPatientNameInput,
    setPatientPhoneInput,
    setIsDifferentPatient,
    setIsTelemedicine,
    clearBookingDraft,
    prepareBookingFromAnalysis,
    handleCreateBooking,
    handleCreatePaymentIntent,
    handleConfirmPaymentAndBooking,
    handleCancelBooking,
    handleDoctorSelect,
    preparePendingPaymentFromBooking,
  }

  return <PatientPortalContext.Provider value={value}>{children}</PatientPortalContext.Provider>
}
