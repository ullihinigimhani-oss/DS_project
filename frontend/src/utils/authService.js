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
    throw new Error(data?.message || data?.error || 'Authentication request failed')
  }

  if (!data) {
    throw new Error('Authentication service returned an unexpected response format')
  }

  return data
}

async function handleAuthResponse(response) {
  return readJson(response)
}

/**
 * Ask auth-service whether this email is already registered (any role: patient, doctor, etc.).
 */
export async function checkEmailAvailability(email) {
  const trimmed = String(email || '').trim()
  if (!trimmed) {
    return { success: true, data: { available: true, existingUserType: null } }
  }

  const response = await fetch(
    `${gatewayBaseUrl}/api/auth/email-availability?email=${encodeURIComponent(trimmed)}`,
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      success: false,
      message: data.message || data.error || 'Unable to check email',
      data: null,
    }
  }

  return data
}

export async function loginUser(payload) {
  const response = await fetch(`${gatewayBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleAuthResponse(response)
}

export async function registerUser(payload) {
  const {
    licenseDocument: LICENSE_DOCUMENT,
    governmentIdDocument: GOVERNMENT_ID_DOCUMENT,
    credentialsDocument: CREDENTIALS_DOCUMENT,
    insuranceDocument: INSURANCE_DOCUMENT,
    ...authPayload
  } = payload

  const response = await fetch(`${gatewayBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(authPayload),
  })

  return handleAuthResponse(response)
}

export async function verifyUser(token) {
  const response = await fetch(`${gatewayBaseUrl}/api/auth/verify`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return handleAuthResponse(response)
}

/**
 * Admin: List all users with search, role filter, and pagination
 */
export async function fetchAdminUsers(token, params = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, String(value))
    }
  })

  const response = await fetch(`${gatewayBaseUrl}/api/admin/users?${search.toString()}`, {
    headers: getAuthHeaders(token),
  })

  return handleAuthResponse(response)
}

/**
 * Admin: Retrieve paginated audit logs
 */
export async function fetchAdminAuditLogs(token, params = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, String(value))
    }
  })

  const response = await fetch(`${gatewayBaseUrl}/api/admin/audit-logs?${search.toString()}`, {
    headers: getAuthHeaders(token),
  })

  return handleAuthResponse(response)
}

/**
 * Admin: Toggle user status (active/inactive)
 */
export async function toggleAdminUserStatus(token, userId, isActive) {
  const response = await fetch(`${gatewayBaseUrl}/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ isActive }),
  })

  return handleAuthResponse(response)
}
