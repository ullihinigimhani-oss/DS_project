export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const gatewayBaseUrl = apiBaseUrl.endsWith('/api')
  ? apiBaseUrl.slice(0, -4)
  : apiBaseUrl

async function readJson(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed')
  }

  return data
}

export async function fetchGatewayHealth() {
  const response = await fetch(`${gatewayBaseUrl}/health`)
  return readJson(response)
}

export async function fetchPublicDoctors() {
  const response = await fetch(`${gatewayBaseUrl}/api/v1/public/doctors`)
  return readJson(response)
}

export async function analyzeSymptoms(payload) {
  const response = await fetch(`${apiBaseUrl}/ai-symptoms/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return readJson(response)
}

export async function fetchAnalysisHistory(userId) {
  const response = await fetch(
    `${apiBaseUrl}/ai-symptoms/history?userId=${encodeURIComponent(userId)}`,
  )

  return readJson(response)
}
