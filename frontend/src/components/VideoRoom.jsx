import { useEffect, useMemo, useState } from 'react'
import {
  endTelemedicineSession,
  fetchTelemedicineSessionById,
} from '../utils/telemedicineService'

function StatusDot({ status }) {
  return <span className={`video-room-status-dot ${status === 'ended' ? 'ended' : 'live'}`} />
}

export default function VideoRoom({
  sessionId,
  peerName = 'Consultation room',
  onEndRedirect,
  allowEndSession = false,
}) {
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState('')

  const token = window.localStorage.getItem('token')

  const meetingHost = useMemo(() => {
    try {
      if (!sessionData?.meeting_url) return ''
      return new URL(sessionData.meeting_url).host
    } catch {
      return ''
    }
  }, [sessionData?.meeting_url])

  useEffect(() => {
    if (!sessionId || !token) {
      setLoading(false)
      setError('The consultation room could not be opened.')
      return
    }

    let cancelled = false

    const loadSession = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchTelemedicineSessionById(token, sessionId)
        if (!cancelled) {
          setSessionData(response.data || null)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'The consultation room is unavailable.')
          setSessionData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [sessionId, token])

  const handleCopyLink = async () => {
    if (!sessionData?.meeting_url) return

    try {
      await window.navigator.clipboard.writeText(sessionData.meeting_url)
    } catch {
      setError('Could not copy the consultation link in this browser.')
    }
  }

  const handleEndSession = async () => {
    if (!sessionData?.id || !token) {
      onEndRedirect?.()
      return
    }

    setEnding(true)
    setError('')

    try {
      await endTelemedicineSession(token, sessionData.id)
    } catch (endError) {
      setError(endError.message || 'Could not end the consultation room cleanly.')
    } finally {
      setEnding(false)
      onEndRedirect?.()
    }
  }

  if (loading) {
    return (
      <div className="video-room-shell">
        <div className="video-room-card">
          <p className="video-room-kicker">Telemedicine consultation</p>
          <h2>Preparing the consultation room...</h2>
          <p>The meeting details are being loaded now.</p>
        </div>
      </div>
    )
  }

  if (error || !sessionData?.meeting_url) {
    return (
      <div className="video-room-shell">
        <div className="video-room-card">
          <p className="video-room-kicker">Telemedicine consultation</p>
          <h2>Video room is unavailable</h2>
          <p>{error || 'The consultation details could not be loaded right now.'}</p>
          <div className="video-room-actions">
            <button type="button" onClick={() => onEndRedirect?.()}>
              Return
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="video-room-shell">
      <div className="video-room-topbar">
        <div>
          <p className="video-room-kicker">Telemedicine consultation</p>
          <h2>{peerName}</h2>
          <div className="video-room-status">
            <StatusDot status={sessionData.status} />
            <span>{sessionData.status === 'ended' ? 'Session ended' : 'Room ready'}</span>
            {meetingHost ? <span>{meetingHost}</span> : null}
          </div>
        </div>

        <div className="video-room-actions">
          <button type="button" className="secondary-button" onClick={handleCopyLink}>
            Copy link
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.open(sessionData.meeting_url, '_blank', 'noopener,noreferrer')}
          >
            Open in new tab
          </button>
          <button type="button" className="secondary-button" onClick={() => onEndRedirect?.()}>
            Close room
          </button>
          {allowEndSession && sessionData.status !== 'ended' ? (
            <button type="button" disabled={ending} onClick={handleEndSession}>
              {ending ? 'Ending...' : 'End consultation'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="video-room-frame-shell">
        <iframe
          className="video-room-frame"
          src={sessionData.meeting_url}
          title="Telemedicine consultation room"
          allow="camera; microphone; fullscreen; display-capture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  )
}
