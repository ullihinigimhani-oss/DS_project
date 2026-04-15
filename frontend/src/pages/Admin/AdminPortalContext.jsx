import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminAuditLogs,
  fetchAdminUsers,
  toggleAdminUserStatus,
} from '../../utils/authService'
import {
  fetchAdminAppointmentStats,
  fetchAdminAppointments,
} from '../../utils/appointmentService'
import {
  approveDoctorVerification,
  fetchAdminVerificationQueue,
  rejectDoctorVerification,
} from '../../utils/doctorService'

const AdminPortalContext = createContext(null)

export const adminSidebarItems = [
  { id: 'overview', label: 'Overview', path: '/admin/dashboard' },
  { id: 'users', label: 'Users', path: '/admin/users' },
  { id: 'doctors', label: 'Doctor Verification', path: '/admin/doctors' },
  { id: 'appointments', label: 'Appointments', path: '/admin/appointments' },
  { id: 'notifications', label: 'Notifications', path: '/admin/notifications' },
  { id: 'profile', label: 'Profile', path: '/admin/profile' },
  { id: 'settings', label: 'Settings', path: '/admin/settings' },
]

export function getInitials(name) {
  return String(name || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatRelativeDate(value) {
  if (!value) return 'No activity yet'

  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'No activity yet'
  }
}

export function formatAdminAppointmentDate(value, time) {
  if (!value) return 'Not scheduled'

  try {
    const base = `${value}T${String(time || '00:00').slice(0, 5)}:00`
    return new Date(base).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'Not scheduled'
  }
}

export function getAppointmentTone(status) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'pending'
  if (status === 'cancelled') return 'warn'
  return 'neutral'
}

export function useAdminPortal() {
  const value = useContext(AdminPortalContext)

  if (!value) {
    throw new Error('useAdminPortal must be used inside AdminPortalProvider')
  }

  return value
}

export function AdminPortalProvider({ session, children }) {
  const isConnectedAdmin = session?.role === 'admin' && session?.mode === 'connected' && session?.token

  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [verificationsLoading, setVerificationsLoading] = useState(false)
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    appointmentsThisMonth: 0,
    pendingDoctors: 0,
  })

  const [users, setUsers] = useState([])
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [userActionId, setUserActionId] = useState('')

  const [verificationQueue, setVerificationQueue] = useState([])
  const [verificationActionId, setVerificationActionId] = useState('')

  const [appointments, setAppointments] = useState([])
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0,
    thisMonth: 0,
    byStatus: {},
  })
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all')
  const [appointmentSearch, setAppointmentSearch] = useState('')

  const [auditLogs, setAuditLogs] = useState([])

  const loadOverview = useCallback(async () => {
    if (!isConnectedAdmin) return

    setLoading(true)

    try {
      const [
        usersData,
        doctorsData,
        patientsData,
        appointmentStatsData,
        verificationData,
      ] = await Promise.all([
        fetchAdminUsers(session.token, { limit: 1 }),
        fetchAdminUsers(session.token, { role: 'doctor', limit: 1 }),
        fetchAdminUsers(session.token, { role: 'patient', limit: 1 }),
        fetchAdminAppointmentStats(session.token),
        fetchAdminVerificationQueue(session.token),
      ])

      const queue = Array.isArray(verificationData.data) ? verificationData.data : []
      const pendingDoctors = queue.filter((item) => item.status === 'submitted_for_review').length

      setOverview({
        totalUsers: usersData.data?.pagination?.total || 0,
        totalDoctors: doctorsData.data?.pagination?.total || 0,
        totalPatients: patientsData.data?.pagination?.total || 0,
        totalAppointments: appointmentStatsData.data?.total || 0,
        appointmentsThisMonth: appointmentStatsData.data?.thisMonth || 0,
        pendingDoctors,
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [isConnectedAdmin, session?.token])

  const loadUsers = useCallback(async () => {
    if (!isConnectedAdmin) return

    setUsersLoading(true)

    try {
      const status =
        userStatusFilter === 'active' ? 'active' : userStatusFilter === 'blocked' ? 'inactive' : ''

      const data = await fetchAdminUsers(session.token, {
        search: userSearch,
        role: userRoleFilter,
        status,
        limit: usersPagination.limit,
        page: usersPagination.page,
      })

      setUsers(Array.isArray(data.data?.users) ? data.data.users : [])
      setUsersPagination((current) => ({
        ...current,
        ...(data.data?.pagination || current),
      }))
    } catch (loadError) {
      setError(loadError.message)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [
    isConnectedAdmin,
    session?.token,
    userRoleFilter,
    userSearch,
    userStatusFilter,
    usersPagination.limit,
    usersPagination.page,
  ])

  const loadVerificationQueue = useCallback(async () => {
    if (!isConnectedAdmin) return

    setVerificationsLoading(true)

    try {
      const data = await fetchAdminVerificationQueue(session.token)
      setVerificationQueue(Array.isArray(data.data) ? data.data : [])
    } catch (loadError) {
      setError(loadError.message)
      setVerificationQueue([])
    } finally {
      setVerificationsLoading(false)
    }
  }, [isConnectedAdmin, session?.token])

  const loadAppointments = useCallback(async () => {
    if (!isConnectedAdmin) return

    setAppointmentsLoading(true)

    try {
      const [listData, statsData] = await Promise.all([
        fetchAdminAppointments(session.token, {
          status: appointmentStatusFilter,
          search: appointmentSearch,
          limit: 100,
        }),
        fetchAdminAppointmentStats(session.token),
      ])

      setAppointments(Array.isArray(listData.data) ? listData.data : [])
      setAppointmentStats(statsData.data || { total: 0, thisMonth: 0, byStatus: {} })
    } catch (loadError) {
      setError(loadError.message)
      setAppointments([])
    } finally {
      setAppointmentsLoading(false)
    }
  }, [appointmentSearch, appointmentStatusFilter, isConnectedAdmin, session?.token])

  const loadAuditLogs = useCallback(async () => {
    if (!isConnectedAdmin) return

    setAuditLoading(true)

    try {
      const data = await fetchAdminAuditLogs(session.token, { limit: 8, page: 1 })
      setAuditLogs(Array.isArray(data.data?.logs) ? data.data.logs : [])
    } catch (loadError) {
      setError(loadError.message)
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }, [isConnectedAdmin, session?.token])

  useEffect(() => {
    if (!isConnectedAdmin) return

    void loadOverview()
    void loadUsers()
    void loadVerificationQueue()
    void loadAppointments()
    void loadAuditLogs()
  }, [isConnectedAdmin, loadAppointments, loadAuditLogs, loadOverview, loadUsers, loadVerificationQueue])

  const handleToggleUserStatus = async (userId, isActive) => {
    setError('')
    setMessage('')
    setUserActionId(userId)

    try {
      await toggleAdminUserStatus(session.token, userId, isActive)
      setMessage(`User ${isActive ? 'activated' : 'blocked'} successfully.`)
      await Promise.all([loadUsers(), loadOverview(), loadAuditLogs()])
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setUserActionId('')
    }
  }

  const handleApproveDoctor = async (doctorId) => {
    setError('')
    setMessage('')
    setVerificationActionId(doctorId)

    try {
      await approveDoctorVerification(session.token, doctorId)
      setMessage(`Doctor ${doctorId} was approved.`)
      await Promise.all([loadVerificationQueue(), loadOverview(), loadAuditLogs()])
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setVerificationActionId('')
    }
  }

  const handleRejectDoctor = async (doctorId) => {
    const reason = window.prompt('Rejection reason (optional):') || 'No reason provided'
    setError('')
    setMessage('')
    setVerificationActionId(doctorId)

    try {
      await rejectDoctorVerification(session.token, doctorId, reason)
      setMessage(`Doctor ${doctorId} was rejected.`)
      await Promise.all([loadVerificationQueue(), loadOverview(), loadAuditLogs()])
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setVerificationActionId('')
    }
  }

  const pendingVerificationCount = useMemo(
    () => verificationQueue.filter((item) => item.status === 'submitted_for_review').length,
    [verificationQueue],
  )

  const recentAppointments = useMemo(() => appointments.slice(0, 8), [appointments])
  const recentUsers = useMemo(() => users.slice(0, 6), [users])

  const appointmentMetrics = useMemo(
    () => [
      { label: 'Confirmed', value: appointmentStats.byStatus?.confirmed || 0 },
      { label: 'Pending', value: appointmentStats.byStatus?.pending || 0 },
      { label: 'Cancelled', value: appointmentStats.byStatus?.cancelled || 0 },
      { label: 'This month', value: appointmentStats.thisMonth || 0 },
    ],
    [appointmentStats.byStatus, appointmentStats.thisMonth],
  )

  const auditPreview = useMemo(
    () =>
      auditLogs.map((item) => ({
        id: item.id,
        action: item.action,
        actor: item.actor_name || item.actor_email || 'Admin',
        recordedAt: formatRelativeDate(item.created_at),
      })),
    [auditLogs],
  )

  const value = {
    session,
    isConnectedAdmin,
    loading,
    usersLoading,
    verificationsLoading,
    appointmentsLoading,
    auditLoading,
    error,
    message,
    overview,
    users,
    usersPagination,
    userSearch,
    userRoleFilter,
    userStatusFilter,
    userActionId,
    verificationQueue,
    verificationActionId,
    appointments,
    appointmentStats,
    appointmentStatusFilter,
    appointmentSearch,
    auditLogs,
    pendingVerificationCount,
    recentAppointments,
    recentUsers,
    appointmentMetrics,
    auditPreview,
    setError,
    setMessage,
    setUserSearch,
    setUserRoleFilter,
    setUserStatusFilter,
    setAppointmentStatusFilter,
    setAppointmentSearch,
    setUsersPagination,
    loadOverview,
    loadUsers,
    loadVerificationQueue,
    loadAppointments,
    loadAuditLogs,
    handleToggleUserStatus,
    handleApproveDoctor,
    handleRejectDoctor,
  }

  return <AdminPortalContext.Provider value={value}>{children}</AdminPortalContext.Provider>
}
