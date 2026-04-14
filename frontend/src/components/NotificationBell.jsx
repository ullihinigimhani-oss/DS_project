import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notificationService'

function formatRelativeTimestamp(value) {
  if (!value) return 'Just now'

  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'Just now'
  }
}

export default function NotificationBell({ token, scope = 'mine', onNavigate, pagePath }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')
  const shellRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchNotifications(token, { limit: 6 }, scope)
      setNotifications(Array.isArray(response.data) ? response.data : [])
      setUnreadCount(Number(response.meta?.unreadCount || 0))
    } catch (loadError) {
      setError(loadError.message)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [scope, token])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return undefined

    const handleOutsideClick = (event) => {
      if (shellRef.current && !shellRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const handleOpen = async () => {
    const nextState = !open
    setOpen(nextState)

    if (nextState) {
      await loadNotifications()
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationRead(token, notificationId)
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch {
      // Keep the dropdown usable even if one notification update fails.
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token)
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    } catch {
      // Keep the dropdown usable even if the bulk action fails.
    }
  }
