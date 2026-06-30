import { useEffect, useState, useCallback } from 'react'
import { api, setApiKey } from './api'
import AddDeadline from './components/AddDeadline'
import DeadlineList from './components/DeadlineList'

export default function App() {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authorized, setAuthorized] = useState(true)
  const [passcode, setPasscode] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    const timeoutId = setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev))
    }, 3000)
    return () => clearTimeout(timeoutId)
  }, [])

  const refresh = useCallback(async (isFormSubmit = false) => {
    try {
      setError(null)
      const data = await api.list()
      setDeadlines(data)
      setAuthorized(true)
    } catch (e) {
      if (e.message === 'UNAUTHORIZED') {
        setAuthorized(false)
        if (isFormSubmit) {
          setError('Incorrect access key. Please try again.')
        }
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleUnlock(e) {
    e.preventDefault()
    if (!passcode.trim()) return
    setApiKey(passcode.trim())
    setLoading(true)
    refresh(true)
  }

  const active = deadlines.filter((d) => d.status !== 'resolved')
  const resolved = deadlines.filter((d) => d.status === 'resolved')

  const activeCount = active.length
  const criticalCount = active.filter((d) => d.urgency === 'critical').length
  const actionedCount = active.filter((d) => d.status === 'actioned').length
  const resolvedCount = resolved.length

  let greetingMsg = "You're all caught up! No pending deadlines."
  if (activeCount > 0) {
    if (criticalCount > 0) {
      greetingMsg = `You have ${activeCount} pending deadline${activeCount > 1 ? 's' : ''}, including ${criticalCount} critical task${criticalCount > 1 ? 's' : ''} requiring immediate attention.`
    } else {
      greetingMsg = `You have ${activeCount} pending deadline${activeCount > 1 ? 's' : ''}. Everything is under control!`
    }
  }

  if (!authorized) {
    return (
      <div className="page lock-page">
        <div className={`lock-card ${error ? 'shake' : ''}`}>
          <div className="lock-header">
            <span className="lock-icon" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              <i className="ri-lock-2-line" style={{ fontSize: '32px', color: 'var(--ink-soft)' }}></i>
            </span>
            <h2>DueRight is Locked</h2>
            <p>Enter the access key to view your dashboard.</p>
          </div>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="Enter Access Key"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
            />
            <button type="submit">Unlock</button>
          </form>
          {error && <p className="field-error" style={{ position: 'static', marginTop: '12px', textAlign: 'center' }}>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <h1>DueRight</h1>
        <p className="tagline">The next step, ready before it&rsquo;s due.</p>
      </header>

      {!loading && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{activeCount}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className={`stat-card ${criticalCount > 0 ? 'critical-alert' : ''}`}>
              <span className="stat-value">{criticalCount}</span>
              <span className="stat-label">Critical</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{actionedCount}</span>
              <span className="stat-label">Actioned</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{resolvedCount}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          <div className={`summary-banner ${activeCount === 0 ? 'all-clear' : ''}`}>
            <span className="banner-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {activeCount === 0 ? (
                <i className="ri-party-line" style={{ color: 'var(--medium)' }}></i>
              ) : criticalCount > 0 ? (
                <i className="ri-error-warning-fill" style={{ color: 'var(--critical)' }}></i>
              ) : (
                <i className="ri-focus-3-line" style={{ color: 'var(--high)' }}></i>
              )}
            </span>
            <p className="banner-text">{greetingMsg}</p>
          </div>
        </>
      )}

      <AddDeadline onAdded={refresh} showToast={showToast} />

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="empty">Loading your deadlines&hellip;</p>
      ) : (
        <>
          <DeadlineList
            title="Active"
            deadlines={active}
            emptyText='Nothing pending. Try adding one above, e.g. "car insurance renews June 30".'
            onChanged={refresh}
            showToast={showToast}
          />
          {resolved.length > 0 && (
            <DeadlineList
              title="Resolved"
              deadlines={resolved}
              muted
              onChanged={refresh}
              showToast={showToast}
            />
          )}
        </>
      )}

      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <i className={
            toast.type === 'error' 
              ? 'ri-error-warning-fill' 
              : toast.type === 'info' 
              ? 'ri-information-line' 
              : 'ri-checkbox-circle-fill'
          }></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
