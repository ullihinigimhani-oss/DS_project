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

  const previewItems = useMemo(() => notifications.slice(0, 5), [notifications])

  return (
    <div className="notification-bell-shell" ref={shellRef}>
      <button
        type="button"
        className={`notification-bell-button ${open ? 'active' : ''}`}
        onClick={() => void handleOpen()}
        aria-label="Open notifications"
      >
        <span className="notification-bell-icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 ? <span className="notification-bell-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <strong>Notifications</strong>
              <span>{scope === 'all' ? 'System-wide updates' : 'Latest updates for you'}</span>
            </div>

            {scope === 'mine' && unreadCount > 0 ? (
              <button type="button" className="notification-inline-action" onClick={() => void handleMarkAllRead()}>
                Mark all read
              </button>
            ) : null}
          </div>

          {loading ? <p className="notification-dropdown-state">Loading notifications...</p> : null}
          {!loading && error ? <p className="notification-dropdown-state">{error}</p> : null}
          {!loading && !error && previewItems.length === 0 ? (
            <p className="notification-dropdown-state">No notifications yet.</p>
          ) : null}

          {!loading && !error && previewItems.length > 0 ? (
            <div className="notification-dropdown-list">
              {previewItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-dropdown-item ${item.read ? '' : 'unread'}`}
                  onClick={() => void handleMarkAsRead(item.id)}
                >
                  <div className="notification-dropdown-item-top">
                    <strong>{item.title}</strong>
                    {!item.read ? <span className="notification-dot" /> : null}
                  </div>
                  <p>{item.message}</p>
                  <div className="notification-dropdown-meta">
                    {scope === 'all' && item.role ? <span>{item.role}</span> : null}
                    <span>{formatRelativeTimestamp(item.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setOpen(false)
              onNavigate(pagePath)
            }}
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  )
}
