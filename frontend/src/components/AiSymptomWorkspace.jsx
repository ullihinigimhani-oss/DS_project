import SectionCard from './SectionCard'

function formatAnalysisSource(source) {
  switch (source) {
    case 'custom-model':
      return 'Internal AI model'
    case 'gemini-fallback':
      return 'Gemini fallback'
    case 'fallback':
      return 'Safe fallback'
    default:
      return source || 'Unknown'
  }
}

function getPrimaryActionPath(session) {
  if (session?.role === 'patient') {
    return '/patient/book-appointment'
  }

  return '/doctors'
}

function formatUrgencyLevel(level) {
  switch (level) {
    case 'urgent':
      return 'Urgent'
    case 'soon':
      return 'Soon'
    case 'routine':
      return 'Routine'
    case 'self_care':
      return 'Self care'
    default:
      return 'Routine'
  }
}

export default function AiSymptomWorkspace({
  session,
  history,
  analysis,
  topCondition,
  symptoms,
  analysisLoading,
  historyLoading,
  analysisError,
  onSymptomsChange,
  onAnalyze,
  onRefreshHistory,
  onNavigate,
  contextLabel = 'Your Symptom Workspace',
  contextSubtitle = 'A private symptom-check journey for the signed-in account, with personal history and preliminary guidance.',
}) {
  const confidencePercent = analysis?.confidence ? Math.round(analysis.confidence * 100) : 0
  const recommendedSpecialist =
    analysis?.recommendedSpecialist || analysis?.primaryModel?.recommendedSpecialist || 'General Physician'
  const carePriority = formatUrgencyLevel(
    analysis?.consultationAdvice?.level || analysis?.severity,
  )

  return (
    <div className="page-stack">
      <SectionCard title={contextLabel} subtitle={contextSubtitle}>
        {session ? (
          <div className="analysis-overview-grid">
            <article className="analysis-overview-card">
              <span>Signed in user</span>
              <strong>{session.name || session.email}</strong>
              <p>{session.email}</p>
            </article>
            <article className="analysis-overview-card">
              <span>Saved analyses</span>
              <strong>{history.length}</strong>
              <p>Only this user&apos;s symptom history is shown on this page.</p>
            </article>
            <article className="analysis-overview-card">
              <span>Workspace status</span>
              <strong>Personal history enabled</strong>
              <p>New analyses are stored against your own account.</p>
            </article>
          </div>
        ) : (
          <div className="analysis-session-guard">
            <strong>Sign in to view your personal symptom history.</strong>
            <p>
              This page is tied to the logged-in account, so each user only sees their own
              saved analyses.
            </p>
            <div className="form-actions">
              <button type="button" onClick={() => onNavigate('/login')}>
                Sign in
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onNavigate('/register')}
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {!session ? null : (
        <SectionCard
          title="AI Symptom Analyzer"
          subtitle="Run a symptom check for the current signed-in user and keep the results in a personal history timeline."
        >
          <form className="analysis-form" onSubmit={onAnalyze}>
            <label>
              Symptoms
              <textarea
                rows="5"
                value={symptoms}
                onChange={(event) => onSymptomsChange(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={analysisLoading}>
                {analysisLoading ? 'Analyzing...' : 'Analyze symptoms'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onRefreshHistory}
                disabled={historyLoading}
              >
                {historyLoading ? 'Refreshing...' : 'Refresh history'}
              </button>
            </div>
          </form>

          {analysisError ? <p className="error-text">{analysisError}</p> : null}
          {analysisLoading ? (
            <div className="analysis-loading-card">
              <div className="analysis-loading-spinner" />
              <div>
                <strong>Analyzing symptoms...</strong>
                <p>
                  We&apos;re preparing preliminary symptom guidance for the signed-in account.
                </p>
              </div>
            </div>
          ) : null}

          {analysis ? (
            <div className="analysis-result">
              <div className="result-banner">
                <strong>
                  {analysis.guidanceType === 'preliminary_symptom_guidance'
                    ? 'Preliminary symptom guidance'
                    : topCondition?.name || 'Symptom summary'}
                </strong>
                <span>
                  Confidence: {confidencePercent}%
                </span>
              </div>
              <div className="analysis-confidence-meter" aria-label={`Confidence ${confidencePercent}%`}>
                <div
                  className="analysis-confidence-meter-fill"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <div className="analysis-overview-grid">
                <article className="analysis-overview-card">
                  <span>Analysis source</span>
                  <strong>{formatAnalysisSource(analysis.source)}</strong>
                  <p>
                    {analysis.source === 'custom-model'
                      ? 'Analysis completed using the internal AI model.'
                      : analysis.source === 'gemini-fallback'
                      ? 'Gemini stepped in because the primary model was not confident enough.'
                      : 'A safe local fallback response was used.'}
                  </p>
                </article>
                <article className="analysis-overview-card">
                  <span>Recommended specialist</span>
                  <strong>{recommendedSpecialist}</strong>
                  <p>Best next clinician to review this symptom pattern.</p>
                </article>
                <article className="analysis-overview-card">
                  <span>Care priority</span>
                  <strong>{carePriority}</strong>
                  <p>
                    {analysis.consultationAdvice?.message ||
                      'Monitor symptoms and seek care if they worsen.'}
                  </p>
                </article>
              </div>
              <div className="analysis-summary-card">
                <strong>Quick summary</strong>
                <ul>
                  <li>
                    Possible condition: <strong>{topCondition?.name || 'Needs more review'}</strong>
                  </li>
                  <li>
                    Confidence: <strong>{confidencePercent}%</strong>
                  </li>
                  <li>
                    Recommended specialist: <strong>{recommendedSpecialist}</strong>
                  </li>
                  <li>
                    Care priority: <strong>{carePriority}</strong>
                  </li>
                </ul>
              </div>
              {topCondition?.name ? (
                <div className="analysis-primary-callout">
                  <span>Most likely condition</span>
                  <strong>{topCondition.name}</strong>
                  <p>{topCondition.reason || 'Most likely match to discuss with a clinician.'}</p>
                </div>
              ) : null}
              <p>{analysis.recommendation}</p>
              <div className="analysis-cta-row">
                <button
                  type="button"
                  className="analysis-primary-cta"
                  onClick={() => onNavigate(getPrimaryActionPath(session))}
                >
                  Book appointment
                </button>
              </div>

              <div className="chip-group">
                {(analysis.detectedSymptoms || []).map((symptom) => (
                  <span key={symptom} className="chip">
                    {symptom}
                  </span>
                ))}
              </div>

              {(analysis.possibleConditions || []).length ? (
                <div className="conditions-list analysis-condition-list">
                  {analysis.possibleConditions.map((condition) => (
                    <article key={condition.name} className="analysis-condition-card">
                      <div className="condition-row">
                        <span>{condition.name}</span>
                        <strong>{condition.confidencePercent}%</strong>
                      </div>
                      <p>{condition.reason || 'Possible condition to review clinically.'}</p>
                      {condition.matchedSymptoms?.length ? (
                        <div className="chip-group compact">
                          {condition.matchedSymptoms.map((symptom) => (
                            <span key={`${condition.name}-${symptom}`} className="chip">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}

              {analysis.consultationAdvice ? (
                <div className="consult-box">
                  <strong>{analysis.consultationAdvice.message}</strong>
                  <span>Risk score: {analysis.consultationAdvice.risk}</span>
                </div>
              ) : null}

              {analysis.primaryModel ? (
                <div className="history-card">
                  <div className="history-header">
                    <strong>Primary model preview</strong>
                    <span>
                      {Math.round((analysis.primaryModel.confidence || 0) * 100)}% confidence
                    </span>
                  </div>
                  <p>
                    Gemini fallback was used because the primary model did not have enough
                    confidence or enough symptom specificity.
                  </p>
                  {(analysis.primaryModel.possibleConditions || []).length ? (
                    <div className="conditions-list">
                      {analysis.primaryModel.possibleConditions
                        .slice(0, 3)
                        .map((condition) => (
                          <div key={`primary-${condition.name}`} className="condition-row">
                            <span>{condition.name}</span>
                            <strong>{condition.confidencePercent}%</strong>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(analysis.selfCare || []).length ? (
                <div className="history-card">
                  <div className="history-header">
                    <strong>Self-care guidance</strong>
                  </div>
                  <ul>
                    {analysis.selfCare.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(analysis.whenToSeekCare || []).length ? (
                <div className="history-card">
                  <div className="history-header">
                    <strong>When to seek care</strong>
                  </div>
                  <ul>
                    {analysis.whenToSeekCare.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      )}

      {!session ? null : (
        <SectionCard
          title="Your Symptom History"
          subtitle="Only analyses saved for the logged-in account appear here."
        >
          {historyLoading ? <p className="empty-state">Loading history...</p> : null}
          {!historyLoading && history.length === 0 ? (
            <p className="empty-state">No symptom history yet. Start your first analysis.</p>
          ) : null}

          <div className="history-list">
            {history.map((item) => (
              <article key={item.id} className="history-card">
                <div className="history-header">
                  <strong>{session.name || session.email}</strong>
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
      )}
    </div>
  )
}
