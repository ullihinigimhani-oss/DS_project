import { useCallback, useEffect, useMemo, useState } from 'react'
import ModernSelect from './ModernSelect'
import ModernSearchBar from './ModernSearchBar'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notificationService'

function formatTimestamp(value) {
  if (!value) return 'Just now'

  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'Just now'
  }
}

const readOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

export default function NotificationCenter({
  token,
  scope = 'mine',
  title,
  subtitle,
  emptyMessage,
}) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState({ unreadCount: 0, total: 0 })
  const [search, setSearch] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([])
      setMeta({ unreadCount: 0, total: 0 })
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchNotifications(
        token,
        {
          search,
          read: readFilter,
          role: scope === 'all' ? roleFilter : undefined,
          limit: 100,
        },
        scope,
      )

      setNotifications(Array.isArray(response.data) ? response.data : [])
      setMeta({
        unreadCount: Number(response.meta?.unreadCount || 0),
        total: Number(response.meta?.total || 0),
      })
    } catch (loadError) {
      setError(loadError.message)
      setNotifications([])
      setMeta({ unreadCount: 0, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [readFilter, roleFilter, scope, search, token])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationRead(token, notificationId)
      await loadNotifications()
    } catch (markError) {
      setError(markError.message)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token)
      await loadNotifications()
    } catch (markError) {
      setError(markError.message)
    }
  }

  const availableRoles = useMemo(() => {
    if (scope !== 'all') return []

    return ['all', ...Array.from(new Set(notifications.map((item) => item.role).filter(Boolean)))]
  }, [notifications, scope])

  return (
    <div className="notification-page-stack">
      <section className="notification-page-card">
        <div className="notification-page-topline">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <div className="notification-page-badges">
            <span className="dashboard-badge">{meta.total} total</span>
            <span className="dashboard-badge">{meta.unreadCount} unread</span>
          </div>
        </div>

        <div className="notification-filter-grid">
          <div className="doctor-compact-field">
            <span>Search notifications</span>
            <ModernSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onReset={() => setSearch('')}
              placeholder="Search notifications"
            />
          </div>

          <div className="doctor-compact-field">
            <span>Status</span>
            <ModernSelect
              value={readFilter}
              onChange={(event) => setReadFilter(event.target.value)}
              options={readOptions}
            />
          </div>

          {scope === 'all' ? (
            <div className="doctor-compact-field">
              <span>Role</span>
              <ModernSelect
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                options={availableRoles.map((role) => ({
                  value: role,
                  label: role === 'all' ? 'All roles' : role,
                }))}
              />
            </div>
          ) : null}
        </div>

        <div className="notification-action-row">
          <button type="button" className="secondary-button" onClick={() => void loadNotifications()}>
            Refresh
          </button>
          {scope === 'mine' ? (
            <button type="button" onClick={() => void handleMarkAllRead()}>
              Mark all read
            </button>
          ) : null}
        </div>

        {loading ? <p className="empty-state">Loading notifications...</p> : null}
        {!loading && error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && notifications.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : null}

        {!loading && !error && notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-card ${notification.read ? '' : 'unread'}`}
              >
                <div className="notification-card-top">
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                  </div>
                  {!notification.read ? <span className="status-pill pending">Unread</span> : null}
                </div>

                <div className="notification-card-meta">
                  <span className="dashboard-badge">{notification.type}</span>
                  {scope === 'all' && notification.role ? (
                    <span className="dashboard-badge">{notification.role}</span>
                  ) : null}
                  <span>{formatTimestamp(notification.createdAt)}</span>
                </div>

                {!notification.read ? (
                  <div className="notification-card-actions">
                    <button type="button" className="secondary-button" onClick={() => void handleMarkAsRead(notification.id)}>
                      Mark as read
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
