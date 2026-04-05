import { useEffect, useMemo, useState } from 'react'
import SectionCard from './components/SectionCard'
import StatusPill from './components/StatusPill'
import {
  analyzeSymptoms,
  apiBaseUrl,
  fetchAnalysisHistory,
  fetchGatewayHealth,
  fetchPublicDoctors,
  gatewayBaseUrl,
} from './utils/api'
import './App.css'

const defaultSymptoms = 'I have fever, cough, headache and runny nose'
const defaultUserId = 'patient-001'

export default function App() {
  const [gatewayHealth, setGatewayHealth] = useState(null)
  const [doctorDirectory, setDoctorDirectory] = useState([])
  const [directoryState, setDirectoryState] = useState('idle')
  const [userId, setUserId] = useState(defaultUserId)
  const [symptoms, setSymptoms] = useState(defaultSymptoms)
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const quickStats = useMemo(() => {
    return [
      {
        label: 'Gateway base',
        value: gatewayBaseUrl,
      },
      {
        label: 'API base',
        value: apiBaseUrl,
      },
      {
        label: 'Doctors loaded',
        value: String(doctorDirectory.length),
      },
    ]
  }, [doctorDirectory.length])

  useEffect(() => {
    const loadGatewayHealth = async () => {
      try {
        const data = await fetchGatewayHealth()
        setGatewayHealth(data)
      } catch (error) {
        setGatewayHealth({
          service: 'api-gateway',
          status: 'unreachable',
          error: error.message,
        })
      }
    }

    const loadDoctorDirectory = async () => {
      setDirectoryState('loading')
      try {
        const data = await fetchPublicDoctors()
        setDoctorDirectory(Array.isArray(data.data) ? data.data : [])
        setDirectoryState('success')
      } catch (error) {
        setDirectoryState('error')
      }
    }

    loadGatewayHealth()
    loadDoctorDirectory()
  }, [])

  const loadHistory = async (nextUserId = userId) => {
    setHistoryLoading(true)
    try {
      const data = await fetchAnalysisHistory(nextUserId)
      setHistory(Array.isArray(data.data) ? data.data : [])
    } catch (error) {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(defaultUserId)
  }, [])

  const handleAnalyze = async (event) => {
    event.preventDefault()
    setAnalysisLoading(true)
    setAnalysisError('')

    try {
      const data = await analyzeSymptoms({
        userId,
        symptoms,
        sessionSymptoms: [],
      })

      setAnalysis(data.data)
      await loadHistory(userId)
    } catch (error) {
      setAnalysisError(error.message)
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const serviceHealthy = gatewayHealth?.status === 'running'

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Smart Healthcare Platform</p>
          <h1>Frontend control room for gateway, doctors, and AI triage.</h1>
          <p className="hero-text">
            This frontend is wired to your running Docker stack through the gateway,
            with a live symptom checker and doctor directory pulled from the backend.
          </p>
          <div className="hero-actions">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <span className="subtle-text">
              {gatewayHealth?.timestamp || gatewayHealth?.error || 'Waiting for gateway health'}
            </span>
          </div>
        </div>
        <div className="stats-grid">
          {quickStats.map((item) => (
            <div key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className="content-grid">
        <SectionCard
          title="Platform Status"
          subtitle="Quick read on the gateway entrypoint and frontend API wiring."
        >
          <div className="health-grid">
            <div className="health-row">
              <span>Gateway service</span>
              <strong>{gatewayHealth?.service || 'api-gateway'}</strong>
            </div>
            <div className="health-row">
              <span>Status</span>
              <StatusPill
                status={serviceHealthy ? 'ok' : 'warn'}
                label={gatewayHealth?.status || 'checking'}
              />
            </div>
            <div className="health-row">
              <span>Port</span>
              <strong>{gatewayHealth?.port || '3000'}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Doctor Directory"
          subtitle="Public doctor listing served from doctor-service through the gateway."
        >
          {directoryState === 'loading' ? <p className="empty-state">Loading doctors...</p> : null}
          {directoryState === 'error' ? (
            <p className="empty-state">Doctor directory is not available yet.</p>
          ) : null}
          {directoryState === 'success' && doctorDirectory.length === 0 ? (
            <p className="empty-state">No approved doctors are available yet.</p>
          ) : null}
          <div className="doctor-list">
            {doctorDirectory.map((doctor) => (
              <article key={doctor.doctor_id} className="doctor-card">
                <div>
                  <h3>{doctor.name || 'Doctor'}</h3>
                  <p>{doctor.specialization || 'General Practice'}</p>
                </div>
                <div className="doctor-meta">
                  <span>Fee: {doctor.consultation_fee ?? 'N/A'}</span>
                  <span>ID: {doctor.doctor_id}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="AI Symptom Analyzer"
          subtitle="Submit symptoms to the AI service through the gateway and review structured recommendations."
        >
          <form className="analysis-form" onSubmit={handleAnalyze}>
            <label>
              User ID
              <input value={userId} onChange={(event) => setUserId(event.target.value)} />
            </label>
            <label>
              Symptoms
              <textarea
                rows="5"
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={analysisLoading}>
                {analysisLoading ? 'Analyzing...' : 'Analyze symptoms'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => loadHistory(userId)}
                disabled={historyLoading}
              >
                {historyLoading ? 'Refreshing...' : 'Refresh history'}
              </button>
            </div>
          </form>

          {analysisError ? <p className="error-text">{analysisError}</p> : null}

          {analysis ? (
            <div className="analysis-result">
              <div className="result-banner">
                <strong>{analysis.possibleConditions?.[0]?.name || 'No diagnosis'}</strong>
                <span>
                  Confidence: {analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : '0%'}
                </span>
              </div>
              <p>{analysis.recommendation}</p>

              <div className="chip-group">
                {(analysis.detectedSymptoms || []).map((symptom) => (
                  <span key={symptom} className="chip">
                    {symptom}
                  </span>
                ))}
              </div>

              {analysis.consultationAdvice ? (
                <div className="consult-box">
                  <strong>{analysis.consultationAdvice.message}</strong>
                  <span>Risk score: {analysis.consultationAdvice.risk}</span>
                </div>
              ) : null}

              <div className="conditions-list">
                {(analysis.possibleConditions || []).map((condition) => (
                  <div key={condition.name} className="condition-row">
                    <span>{condition.name}</span>
                    <strong>{condition.confidencePercent}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Analysis History"
          subtitle="Most recent persisted symptom analyses from PostgreSQL."
        >
          {historyLoading ? <p className="empty-state">Loading history...</p> : null}
          {!historyLoading && history.length === 0 ? (
            <p className="empty-state">No history for this user yet.</p>
          ) : null}
          <div className="history-list">
            {history.map((item) => (
              <article key={item.id} className="history-card">
                <div className="history-header">
                  <strong>{item.user_id}</strong>
                  <span>{new Date(item.analyzed_at).toLocaleString()}</span>
                </div>
                <p>{item.symptoms}</p>
                <div className="chip-group compact">
                  {(item.detected_symptoms || []).map((symptom) => (
                    <span key={symptom} className="chip">
                      {symptom}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </main>
    </div>
  )
}
