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

const roadmapCards = [
  {
    title: 'Auth journeys',
    description: 'Login, registration, and role-aware navigation will plug in next.',
    label: 'Queued',
  },
  {
    title: 'Appointments',
    description: 'Booking and availability flows will sit on top of doctor schedules.',
    label: 'Queued',
  },
  {
    title: 'Telemedicine',
    description: 'Video sessions and live consult handoff will arrive after auth routes settle.',
    label: 'Upcoming',
  },
  {
    title: 'Payments',
    description: 'Checkout, billing state, and receipts are waiting for final payment wiring.',
    label: 'Upcoming',
  },
  {
    title: 'Notifications',
    description: 'Bell states, reminders, and patient nudges will connect once events stabilize.',
    label: 'Queued',
  },
  {
    title: 'Medical records',
    description: 'Patient-owned records and uploads will land in the next frontend pass.',
    label: 'Planned',
  },
]

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

  const topCondition = analysis?.possibleConditions?.[0] || null
  const serviceHealthy = gatewayHealth?.status === 'running'
  const quickStats = useMemo(() => {
    return [
      {
        label: 'Live entrypoint',
        value: gatewayBaseUrl.replace('http://', ''),
      },
      {
        label: 'Connected doctors',
        value: String(doctorDirectory.length),
      },
      {
        label: 'Analysis records',
        value: String(history.length),
      },
      {
        label: 'Foundation mode',
        value: 'Live integrations only',
      },
    ]
  }, [doctorDirectory.length, history.length])

  const liveModules = [
    {
      title: 'Gateway',
      value: gatewayHealth?.status || 'checking',
      detail: gatewayHealth?.timestamp || 'Waiting for gateway response',
      status: serviceHealthy ? 'ok' : 'warn',
    },
    {
      title: 'Doctor directory',
      value: `${doctorDirectory.length} listed`,
      detail: 'Public doctor profiles from doctor-service',
      status: directoryState === 'success' ? 'ok' : directoryState === 'error' ? 'warn' : 'pending',
    },
    {
      title: 'AI triage',
      value: topCondition?.name || 'Ready',
      detail: topCondition
        ? `${topCondition.confidencePercent}% confidence from ai-symptom-service`
        : 'Submit symptoms to generate a triage result',
      status: analysis ? 'ok' : 'pending',
    },
    {
      title: 'History sync',
      value: `${history.length} saved`,
      detail: 'Persisted symptom analyses from PostgreSQL',
      status: history.length > 0 ? 'ok' : historyLoading ? 'pending' : 'warn',
    },
  ]

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

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy panel panel-hero">
          <p className="eyebrow">Frontend Foundation</p>
          <h1>Warm, clear, and ready for the services already alive in your stack.</h1>
          <p className="hero-text">
            This foundation page is connected to the running gateway, doctor directory,
            and AI symptom analyzer. The rest of the experience is staged neatly so we
            can grow the frontend feature by feature without losing visual consistency.
          </p>
          <div className="hero-actions">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <StatusPill status="pending" label="Frontend foundation branch" />
            <span className="subtle-text">{apiBaseUrl}</span>
          </div>
          <div className="hero-note">
            <strong>Current focus:</strong> polished shell, live doctor browsing, AI triage,
            and clean placeholders for the next service waves.
          </div>
        </div>
        <div className="stats-grid">
          {quickStats.map((item) => (
            <div key={item.label} className="stat-card panel">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <section className="module-strip">
        {liveModules.map((module) => (
          <article key={module.title} className="module-card panel">
            <div className="module-header">
              <span>{module.title}</span>
              <StatusPill status={module.status} label={module.value} />
            </div>
            <p>{module.detail}</p>
          </article>
        ))}
      </section>

      <main className="content-grid">
        <SectionCard
          title="Platform Pulse"
          subtitle="The frontend is intentionally focused on what is actually available today."
        >
          <div className="health-grid soft-list">
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
              <span>Public doctors</span>
              <strong>{doctorDirectory.length}</strong>
            </div>
            <div className="health-row">
              <span>Latest AI status</span>
              <strong>{topCondition?.name || 'Waiting for first analysis'}</strong>
            </div>
            <div className="health-row">
              <span>Saved history</span>
              <strong>{history.length}</strong>
            </div>
          </div>
          <div className="foundation-callout">
            <strong>Why this shape?</strong>
            <p>
              We’re building the experience around live backend capability first, so every
              visible panel already maps to a working gateway-backed route instead of static mock content.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Doctor Directory"
          subtitle="Approved doctor profiles from doctor-service, presented as the first live discovery surface."
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
                <div className="doctor-topline">
                  <StatusPill status="ok" label="Approved" />
                  <span className="doctor-id">{doctor.doctor_id}</span>
                </div>
                <div>
                  <h3>{doctor.name || 'Doctor'}</h3>
                  <p>{doctor.specialization || 'General Practice'}</p>
                </div>
                <div className="doctor-meta">
                  <span>Consultation fee</span>
                  <strong>{doctor.consultation_fee ?? 'N/A'}</strong>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="AI Triage Workspace"
          subtitle="A clean foundation for symptom-driven triage while richer patient workflows are still on the way."
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

              {analysis.matchedDiseaseSymptoms?.length ? (
                <div className="matched-symptoms">
                  <span className="list-label">Matched disease symptom set</span>
                  <div className="chip-group compact">
                    {analysis.matchedDiseaseSymptoms.map((symptom) => (
                      <span key={symptom} className="chip chip-muted">
                        {symptom}
                      </span>
                    ))}
                  </div>
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
          title="Analysis Timeline"
          subtitle="Recent symptom analyses already saved by the AI service, ready to evolve into a patient journey view."
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

      <section className="roadmap-section">
        <div className="roadmap-heading">
          <p className="eyebrow">Next Surface Areas</p>
          <h2>Planned frontend modules while the remaining services settle.</h2>
          <p>
            These cards keep the structure intentional now, so the next branches can slot in
            without redesigning the whole app shell again.
          </p>
        </div>
        <div className="roadmap-grid">
          {roadmapCards.map((card) => (
            <article key={card.title} className="roadmap-card panel">
              <div className="roadmap-topline">
                <h3>{card.title}</h3>
                <StatusPill status="pending" label={card.label} />
              </div>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
