import { gatewayBaseUrl } from './api'

async function handleAuthResponse(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Authentication request failed')
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
  const response = await fetch(`${gatewayBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleAuthResponse(response)
}
