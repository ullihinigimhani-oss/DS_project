import { gatewayBaseUrl } from './api'

const paymentApiBase = `${gatewayBaseUrl}/api/payments`
const authTokenStorageKey = 'token'
const sessionStorageKey = 'healthcare-auth-shell-session'

function readPersistedToken() {
  if (typeof window === 'undefined') return ''

  const directToken = window.localStorage.getItem(authTokenStorageKey)
  if (directToken) return directToken

  const rawSession = window.localStorage.getItem(sessionStorageKey)
  if (!rawSession) return ''

  try {
    const parsed = JSON.parse(rawSession)
    return parsed?.token || ''
  } catch {
    return ''
  }
}

function getAuthHeaders(token, extraHeaders = {}) {
  const resolvedToken = token || readPersistedToken()
  return {
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...extraHeaders,
  }
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Payment request failed')
  }

  return data
}

export async function createStripePayment(token, payload) {
  const response = await fetch(`${paymentApiBase}/insertPayment`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function confirmStripePayment(token, paymentId, transactionId) {
  const response = await fetch(`${paymentApiBase}/payments/${paymentId}/confirm`, {
    method: 'PATCH',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      transactionId,
    }),
  })

  return readJson(response)
}

export async function fetchAppointmentPayment(appointmentId) {
  const response = await fetch(
    `${paymentApiBase}/getAppointmentPayment?appointment_id=${encodeURIComponent(appointmentId)}`,
  )

  return readJson(response)
}
