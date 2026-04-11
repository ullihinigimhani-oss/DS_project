import { gatewayBaseUrl } from './api'

function getAuthHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  }
}

async function readJson(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Patient request failed')
  }

  return data
}

export async function fetchPatientProfileById(patientId) {
  const response = await fetch(`${gatewayBaseUrl}/api/patients/${patientId}`)
  return readJson(response)
}

export async function fetchPatientMedicalRecords(token, patientId) {
  const response = await fetch(`${gatewayBaseUrl}/api/v1/medical-records/patient/${patientId}`, {
    headers: getAuthHeaders(token),
  })

  return readJson(response)
}
