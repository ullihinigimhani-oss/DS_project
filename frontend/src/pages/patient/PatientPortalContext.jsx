import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  cancelPatientBooking,
  createPatientBooking,
  fetchDoctorAvailability,
  fetchPatientBookings,
} from '../../utils/appointmentService'

const PatientPortalContext = createContext(null)

export const patientSidebarItems = [
  { id: 'overview', label: 'Overview', path: '/patient' },
  { id: 'book', label: 'Book Appointment', path: '/patient/book-appointment' },
  { id: 'bookings', label: 'My Bookings', path: '/patient/my-bookings' },
  { id: 'doctors', label: 'Doctors', path: '/patient/doctors' },
  { id: 'symptoms', label: 'Symptom History', path: '/patient/symptom-history' },
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

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
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
  const isConnectedPatient =
    activeRole === 'patient' &&
    session?.role === 'patient' &&
    session?.mode === 'connected' &&
    session?.token

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

  const handleCreateBooking = async (slot) => {
    if (!isConnectedPatient || !selectedDoctor) {
      setBookingError('Sign in as a patient to create a real booking.')
      return false
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
      setBookingMessage('Appointment request created successfully.')
      return true
    } catch (error) {
      setBookingError(error.message)
      return false
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
    availability,
    availabilityLoading,
    bookings,
    bookingsLoading,
    bookingError,
    bookingMessage,
    bookingBusyId,
    reason,
    isTelemedicine,
    verifiedDoctors,
    recentHistory,
    selectedDoctor,
    availableSlots,
    bookingSummary,
    patientMetrics,
    setSelectedDoctorId,
    setWeekStart,
    setReason,
    setIsTelemedicine,
    handleCreateBooking,
    handleCancelBooking,
    handleDoctorSelect,
  }

  return <PatientPortalContext.Provider value={value}>{children}</PatientPortalContext.Provider>
}
