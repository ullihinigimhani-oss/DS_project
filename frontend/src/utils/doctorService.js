import { gatewayBaseUrl } from './api'

const doctorApiBase = `${gatewayBaseUrl}/api/v1`

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
    if (data?.message || data?.error) {
      throw new Error(data.message || data.error)
    }

    throw new Error(`Doctor request failed (${response.status})`)
  }

  if (!data) {
    throw new Error('Doctor service returned an unexpected response format')
  }

  return data
}

export function resolveDoctorAssetUrl(assetPath) {
  if (!assetPath) return ''
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath
  return `${gatewayBaseUrl}${assetPath}`
}

export async function fetchDoctorProfile(token) {
  const response = await fetch(`${doctorApiBase}/public/profile`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function updateDoctorProfile(token, payload) {
  const response = await fetch(`${doctorApiBase}/public/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function fetchDoctorSchedule(token, weekStart) {
  const search = new URLSearchParams()
  if (weekStart) search.set('weekStart', weekStart)

  const response = await fetch(`${doctorApiBase}/schedule?${search.toString()}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function setDoctorScheduleType(token, scheduleType) {
  const response = await fetch(`${doctorApiBase}/schedule/type`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ scheduleType }),
  })

  return readJson(response)
}

export async function addDoctorScheduleSlot(token, payload) {
  const response = await fetch(`${doctorApiBase}/schedule/slots`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function toggleDoctorScheduleSlot(token, slotId, isAvailable) {
  const response = await fetch(`${doctorApiBase}/schedule/slots/${slotId}/availability`, {
    method: 'PUT',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ isAvailable }),
  })

  return readJson(response)
}

export async function deleteDoctorScheduleSlot(token, slotId) {
  const response = await fetch(`${doctorApiBase}/schedule/slots/${slotId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function resetDoctorScheduleWeek(token, weekStart) {
  const response = await fetch(`${doctorApiBase}/schedule/reset-week`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ weekStart }),
  })

  return readJson(response)
}

export async function fetchDoctorVerificationStatus(token, doctorId) {
  const response = await fetch(`${doctorApiBase}/verification/status/${doctorId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function fetchDoctorDocuments(token, doctorId) {
  const response = await fetch(`${doctorApiBase}/verification/documents/${doctorId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function uploadDoctorDocument(token, file, documentType) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('documentType', documentType)

  const response = await fetch(`${doctorApiBase}/verification/upload`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: formData,
  })

  return readJson(response)
}

export async function submitDoctorVerification(token) {
  const response = await fetch(`${doctorApiBase}/verification/submit`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function fetchAdminVerificationQueue(token) {
  const response = await fetch(`${doctorApiBase}/verification/all`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function approveDoctorVerification(token, doctorId) {
  const response = await fetch(`${doctorApiBase}/verification/approve/${encodeURIComponent(doctorId)}`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function rejectDoctorVerification(token, doctorId, reason) {
  const response = await fetch(`${doctorApiBase}/verification/reject/${encodeURIComponent(doctorId)}`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ reason }),
  })

  return readJson(response)
}

export async function fetchDoctorPrescriptions(token) {
  const response = await fetch(`${doctorApiBase}/prescriptions/my`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function fetchDoctorPatientPrescriptions(token, patientId) {
  const response = await fetch(`${doctorApiBase}/prescriptions/patient/${patientId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}

export async function issueDoctorPrescription(token, payload) {
  const response = await fetch(`${doctorApiBase}/prescriptions`, {
    method: 'POST',
    headers: getAuthHeaders(token, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })

  return readJson(response)
}
