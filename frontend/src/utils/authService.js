import { gatewayBaseUrl } from './api'

async function handleAuthResponse(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Authentication request failed')
  }

  return data
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
