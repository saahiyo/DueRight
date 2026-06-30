import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import AddDeadline from './components/AddDeadline'
import DeadlineList from './components/DeadlineList'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, isFirebaseAuthEnabled } from './firebase'

export default function App() {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authorized, setAuthorized] = useState(true)
  const [showPasscode, setShowPasscode] = useState(false)
  const [toast, setToast] = useState(null)

  // Firebase Auth states
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    const timeoutId = setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev))
    }, 3000)
    return () => clearTimeout(timeoutId)
  }, [])

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await api.list()
      setDeadlines(data)
      setAuthorized(true)
    } catch (e) {
      if (e.message === 'UNAUTHORIZED') {
        setAuthorized(false)
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Subscribe to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseAuthEnabled()) {
      setUser({ email: 'local-dev@dueright.com', uid: 'local-user-123' })
      setAuthorized(true)
      refresh()
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        setAuthorized(true)
        refresh()
      } else {
        setAuthorized(false)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [refresh])

  async function handleAuthSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (!isFirebaseAuthEnabled()) {
        setUser({ email: email.trim(), uid: 'local-user-123' })
        setAuthorized(true)
        refresh()
        showToast('Logged in successfully (Mock Auth).')
      } else {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email.trim(), password.trim())
          showToast('Signed in successfully!')
        } else {
          await createUserWithEmailAndPassword(auth, email.trim(), password.trim())
          showToast('Account registered successfully!')
        }
      }
    } catch (err) {
      let msg = err.message
      if (msg.includes('auth/invalid-credential')) {
        msg = 'Invalid email or password.'
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.'
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email is already registered.'
      } else if (msg.includes('auth/invalid-email')) {
        msg = 'Please enter a valid email address.'
      }
      setAuthError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    if (!isFirebaseAuthEnabled()) {
      setUser(null)
      setAuthorized(false)
    } else {
      await signOut(auth)
    }
    showToast('Logged out successfully.')
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

  if (loading && deadlines.length === 0 && authorized) {
    return (
      <div className="page lock-page">
        <div className="lock-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <i className="ri-loader-4-line ri-spin" style={{ fontSize: '36px', color: 'var(--ink)' }}></i>
          <p style={{ marginTop: '16px', fontSize: '14.5px', color: 'var(--ink-soft)', fontWeight: 500 }}>Connecting to DueRight...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="page lock-page">
        <div className={`lock-card ${authError ? 'shake' : ''}`}>
          <div className="lock-header">
            <span className="lock-icon" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              <i className="ri-shield-user-line" style={{ fontSize: '32px', color: 'var(--ink-soft)' }}></i>
            </span>
            <h2>{authMode === 'login' ? 'Sign In to DueRight' : 'Create Account'}</h2>
            <p>{authMode === 'login' ? 'Enter credentials to manage deadlines' : 'Register to get your personal board'}</p>
          </div>
          <form onSubmit={handleAuthSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={authLoading}
              style={{ textAlign: 'left', marginBottom: '12px' }}
            />
            <div className="password-input-wrapper">
              <input
                type={showPasscode ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authLoading}
                style={{ textAlign: 'left' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPasscode(!showPasscode)}
                title={showPasscode ? "Hide Password" : "Show Password"}
              >
                <i className={showPasscode ? "ri-eye-off-line" : "ri-eye-line"}></i>
              </button>
            </div>
            <button type="submit" className="lock-submit-btn" disabled={authLoading}>
              {authLoading ? 'Connecting...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          {authError && <p className="field-error" style={{ position: 'static', marginTop: '12px', textAlign: 'center' }}>{authError}</p>}
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--ink-soft)' }}>
            {authMode === 'login' ? (
              <>
                New to DueRight?{' '}
                <button type="button" className="link-btn text-link" onClick={() => { setAuthMode('register'); setAuthError(null); }} style={{ background: 'none', border: 'none', padding: 0 }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="link-btn text-link" onClick={() => { setAuthMode('login'); setAuthError(null); }} style={{ background: 'none', border: 'none', padding: 0 }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>DueRight</h1>
          <p className="tagline">The next step, ready before it&rsquo;s due.</p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="ri-user-line"></i> {user.email}
            </span>
            <button 
              type="button" 
              onClick={handleLogout} 
              className="link-btn text-link" 
              style={{ fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <i className="ri-logout-box-r-line"></i> Log out
            </button>
          </div>
        )}
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
