import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import AddDeadline from './components/AddDeadline'
import DeadlineList from './components/DeadlineList'

export default function App() {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await api.list()
      setDeadlines(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
            <span className="banner-icon">{activeCount === 0 ? '🎉' : criticalCount > 0 ? '⚠️' : '🎯'}</span>
            <p className="banner-text">{greetingMsg}</p>
          </div>
        </>
      )}

      <AddDeadline onAdded={refresh} />

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
          />
          {resolved.length > 0 && (
            <DeadlineList
              title="Resolved"
              deadlines={resolved}
              muted
              onChanged={refresh}
            />
          )}
        </>
      )}
    </div>
  )
}
