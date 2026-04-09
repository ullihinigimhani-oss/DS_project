import { gatewayBaseUrl } from './api'

const appointmentApiBase = `${gatewayBaseUrl}/api/v1/appointments`

function getAuthHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  }
}

async function readJson(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Appointment request failed')
  }

  return data
}

export async function fetchDoctorAppointments(token) {
  const response = await fetch(`${appointmentApiBase}/doctor`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function approveDoctorAppointment(token, appointmentId) {
  const response = await fetch(`${appointmentApiBase}/${appointmentId}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function rejectDoctorAppointment(token, appointmentId, reason) {
  const response = await fetch(`${appointmentApiBase}/${appointmentId}/reject`, {
    method: 'PUT',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      reason: reason || undefined,
    }),
  })

  return readJson(response)
}

export async function fetchDoctorAvailability(doctorId, weekStart) {
  const search = new URLSearchParams()
  if (weekStart) search.set('weekStart', weekStart)

  const response = await fetch(
    `${appointmentApiBase}/doctors/${doctorId}/slots?${search.toString()}`,
  )

  return readJson(response)
}

export async function createPatientBooking(token, payload) {
  const response = await fetch(`${appointmentApiBase}`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function fetchPatientBookings(token, status) {
  const search = new URLSearchParams()
  if (status) search.set('status', status)

  const query = search.toString()
  const response = await fetch(`${appointmentApiBase}${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function cancelPatientBooking(token, appointmentId) {
  const response = await fetch(`${appointmentApiBase}/${appointmentId}/cancel`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}
