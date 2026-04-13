import { gatewayBaseUrl } from './api'

const telemedicineApiBase = `${gatewayBaseUrl}/api/telemedicine`

function getAuthHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  }
}

async function readJson(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Telemedicine request failed')
  }

  return data
}

export async function fetchTelemedicineSessions(token) {
  const response = await fetch(`${telemedicineApiBase}/sessions`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function fetchTelemedicineSessionByAppointment(token, appointmentId) {
  const response = await fetch(`${telemedicineApiBase}/sessions/appointment/${appointmentId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function fetchTelemedicineSessionById(token, sessionId) {
  const response = await fetch(`${telemedicineApiBase}/sessions/${sessionId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function createTelemedicineSession(token, payload) {
  const response = await fetch(`${telemedicineApiBase}/sessions`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function endTelemedicineSession(token, sessionId) {
  const response = await fetch(`${telemedicineApiBase}/sessions/${sessionId}/end`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}
