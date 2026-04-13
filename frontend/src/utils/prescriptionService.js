import { gatewayBaseUrl } from './api'

const prescriptionApiBase = `${gatewayBaseUrl}/api/v1/prescriptions`

async function readJson(response) {
  const raw = await response.text()
  let data = null

  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Prescription request failed (${response.status})`)
  }

  return data
}

export async function fetchMyPrescriptions(token) {
  const response = await fetch(`${prescriptionApiBase}/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return readJson(response)
}
