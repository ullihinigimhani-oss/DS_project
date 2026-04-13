import { gatewayBaseUrl } from './api'

function getAuthHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  }
}

async function readJson(response) {
  const raw = await response.text()
  let data = null

  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Notification request failed')
  }

  if (!data) {
    throw new Error('Notification service returned an unexpected response format')
  }

  return data
}

function buildQuery(options = {}) {
  const params = new URLSearchParams()

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '' && value !== 'all') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function fetchNotifications(token, options = {}, scope = 'mine') {
  const path = scope === 'all' ? '/api/notifications/all' : '/api/notifications'
  const response = await fetch(`${gatewayBaseUrl}${path}${buildQuery(options)}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function markNotificationRead(token, notificationId) {
  const response = await fetch(`${gatewayBaseUrl}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function markAllNotificationsRead(token) {
  const response = await fetch(`${gatewayBaseUrl}/api/notifications/mark-all-read`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}
