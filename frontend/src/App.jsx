import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import AddDeadline from './components/AddDeadline'
import DeadlineList from './components/DeadlineList'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth, isFirebaseAuthEnabled } from './firebase'

export default function App() {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Auth state
  const [authorized, setAuthorized] = useState(false)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Notification Toast Stack
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.list()
      setDeadlines(data)
    } catch (err) {
      setError('Could not connect to the DueRight server.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseAuthEnabled()) {
      // Mock Auth Developer Bypass (zero-config local dev run)
      setUser({ email: 'local-dev@dueright.com', uid: 'local-user-123' })
      setAuthorized(true)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setAuthorized(true)
      } else {
        setUser(null)
        setAuthorized(false)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch deadlines when authorized
  useEffect(() => {
    if (authorized) {
      refresh()
    }
  }, [authorized, refresh])

  async function handleAuthSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (!isFirebaseAuthEnabled()) {
        // Mock Auth Bypass
        setUser({ email, uid: 'local-user-123' })
        setAuthorized(true)
        showToast('Logged in successfully (Mock Auth).')
      } else {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email.trim(), password)
          showToast('Signed in successfully!')
        } else {
          await createUserWithEmailAndPassword(auth, email.trim(), password)
          showToast('Account registered successfully!')
        }
      }
    } catch (err) {
      let msg = err.message
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password entered.'
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

  async function handleGoogleSignIn() {
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (!isFirebaseAuthEnabled()) {
        setUser({ email: 'google-user@dueright.com', uid: 'local-google-user', displayName: 'Shakir Ansari' })
        setAuthorized(true)
        refresh()
        showToast('Signed in with Google (Mock Auth).')
      } else {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
        showToast('Signed in with Google successfully!')
      }
    } catch (err) {
      setAuthError(err.message)
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
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4">
        <div className="w-full max-w-[380px] bg-white border border-[#e6e4df] rounded-2xl flex flex-col items-center justify-center p-10 shadow-[0_12px_32px_rgba(0,0,0,0.04)] text-center">
          <i className="ri-loader-4-line ri-spin text-4xl text-[#1c1b1f]"></i>
          <p className="mt-4 text-[14.5px] text-[#6b6b70] font-medium animate-pulse">Connecting to DueRight...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4">
        <div className={`w-full max-w-[380px] bg-white border border-[#e6e4df] rounded-2xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.04)] text-center ${authError ? 'shake' : ''}`}>
          <div className="flex flex-col items-center mb-6">
            <span className="w-12 h-12 rounded-full bg-[#faf9f6] flex items-center justify-center mb-4 border border-[#e6e4df]">
              <i className="ri-shield-user-line text-[32px] text-[#6b6b70]"></i>
            </span>
            <h2 className="text-xl font-bold text-[#1c1b1f] mb-1">{authMode === 'login' ? 'Sign In to DueRight' : 'Create Account'}</h2>
            <p className="text-[13px] text-[#6b6b70]">{authMode === 'login' ? 'Enter credentials to manage deadlines' : 'Register to get your personal board'}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="flex flex-col">
            <input
              type="email"
              className="w-full h-11 bg-white border border-[#e6e4df] rounded-[10px] px-3.5 text-sm placeholder-[#9a9a95] focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6] mb-3 text-left"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={authLoading}
            />
            <div className="relative w-full mb-3">
              <input
                type={showPasscode ? 'text' : 'password'}
                className="w-full h-11 bg-white border border-[#e6e4df] rounded-[10px] px-3.5 text-sm placeholder-[#9a9a95] focus:outline-none focus:border-[#6b6b70] transition-colors disabled:bg-[#faf9f6] text-left"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={authLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[#6b6b70] hover:text-[#1c1b1f] cursor-pointer p-1 flex items-center justify-center text-lg transition-colors z-10"
                onClick={() => setShowPasscode(!showPasscode)}
                title={showPasscode ? "Hide Password" : "Show Password"}
              >
                <i className={showPasscode ? "ri-eye-off-line" : "ri-eye-line"}></i>
              </button>
            </div>
            <button 
              type="submit" 
              className="w-full h-11 bg-[#1c1b1f] text-white border-none py-2 px-4 rounded-[10px] text-sm font-semibold hover:bg-[#2c2b30] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2" 
              disabled={authLoading}
            >
              {authLoading ? 'Connecting...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="flex items-center my-4 gap-2">
            <div className="flex-1 h-[1px] bg-[#e6e4df]"></div>
            <span className="text-[11px] text-[#6b6b70] uppercase tracking-[0.5px]">or</span>
            <div className="flex-1 h-[1px] bg-[#e6e4df]"></div>
          </div>

          <button 
            type="button" 
            className="w-full flex items-center justify-center py-3 border border-[#e6e4df] bg-white text-[#1c1b1f] rounded-[10px] text-[15px] font-semibold hover:bg-[#fcfcfc] hover:border-[#d1d1d6] cursor-pointer transition-all duration-200"
            onClick={handleGoogleSignIn} 
            disabled={authLoading}
          >
            <i className="ri-google-fill text-[#db4437] mr-1.5"></i>
            Sign in with Google
          </button>
          {authError && <p className="text-xs font-semibold text-[#c8442e] mt-3 text-center">{authError}</p>}
          <div className="mt-4 text-[13px] text-[#6b6b70]">
            {authMode === 'login' ? (
              <>
                New to DueRight?{' '}
                <button type="button" className="border-none bg-none text-[#1c1b1f] font-semibold underline cursor-pointer p-0" onClick={() => { setAuthMode('register'); setAuthError(null); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="border-none bg-none text-[#1c1b1f] font-semibold underline cursor-pointer p-0" onClick={() => { setAuthMode('login'); setAuthError(null); }}>
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
    <div className="max-w-[720px] mx-auto px-6 pt-12 pb-20 max-sm:px-3 max-sm:pt-6 max-sm:pb-16">
      <header className="mb-8 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">DueRight</h1>
          <p className="text-[15px] text-[#6b6b70]">The next step, ready before it&rsquo;s due.</p>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="group relative flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded-full bg-white border border-[#e6e4df] hover:border-[#6b6b70] hover:bg-[#fafafa] transition-all duration-200 max-w-[150px] whitespace-nowrap">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-[#e6e4df]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#1c1b1f] text-white flex items-center justify-center text-[11px] font-bold">
                  {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
              )}
              <span className="text-[13.5px] font-semibold text-[#1c1b1f] truncate whitespace-nowrap">
                {user.displayName || user.email.split('@')[0]}
              </span>
              <div className="absolute bottom-[-36px] right-1/2 translate-x-1/2 -translate-y-1 bg-[#1c1b1f] text-white py-1.5 px-2.5 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] pointer-events-none z-[100]">
                {user.email}
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleLogout} 
              className="text-[13.5px] inline-flex items-center gap-1 text-[#1c1b1f] hover:text-[#6b6b70] font-semibold whitespace-nowrap cursor-pointer transition-all duration-200"
            >
              <i className="ri-logout-box-r-line"></i> Log out
            </button>
          </div>
        )}
      </header>

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-[#e6e4df] rounded-[10px] py-3.5 px-2.5 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="text-xl font-bold text-[#1c1b1f] font-mono">{activeCount}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b70] mt-1">Pending</span>
            </div>
            <div className={`bg-white border border-[#e6e4df] rounded-[10px] py-3.5 px-2.5 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${criticalCount > 0 ? 'border-[#c8442e]/30 bg-[#fdf4f2] text-[#c8442e]' : ''}`}>
              <span className={`text-xl font-bold text-[#1c1b1f] font-mono ${criticalCount > 0 ? '!text-[#c8442e]' : ''}`}>{criticalCount}</span>
              <span className={`text-[11px] font-semibold uppercase tracking-wider text-[#6b6b70] mt-1 ${criticalCount > 0 ? '!text-[#c8442e]/80' : ''}`}>Critical</span>
            </div>
            <div className="bg-white border border-[#e6e4df] rounded-[10px] py-3.5 px-2.5 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="text-xl font-bold text-[#1c1b1f] font-mono">{actionedCount}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b70] mt-1">Actioned</span>
            </div>
            <div className="bg-white border border-[#e6e4df] rounded-[10px] py-3.5 px-2.5 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <span className="text-xl font-bold text-[#1c1b1f] font-mono">{resolvedCount}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b70] mt-1">Resolved</span>
            </div>
          </div>

          <div className={`flex items-center gap-3 mb-6 p-4 rounded-[10px] border border-[#d98a33]/15 bg-[#fcf1e2] text-sm text-[#1c1b1f] leading-snug ${activeCount === 0 ? '!bg-[#e9f0f7] !border-[#3b6fa0]/15' : ''}`}>
            <span className="text-lg flex items-center">
              {activeCount === 0 ? (
                <i className="ri-party-line text-[#3b6fa0]"></i>
              ) : criticalCount > 0 ? (
                <i className="ri-error-warning-fill text-[#c8442e]"></i>
              ) : (
                <i className="ri-focus-3-line text-[#d98a33]"></i>
              )}
            </span>
            <p className="m-0 text-sm font-medium text-[#1c1b1f] leading-snug">{greetingMsg}</p>
          </div>
        </>
      )}

      <AddDeadline onAdded={refresh} showToast={showToast} />

      {error && <div className="bg-[#fdf4f2] border border-[#c8442e]/15 text-[#c8442e] p-3 rounded-lg text-sm mb-4">{error}</div>}

      {loading ? (
        <p className="text-sm text-[#6b6b70] italic my-4">Loading your deadlines&hellip;</p>
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
        <div className={`fixed bottom-6 left-6 flex items-center gap-2.5 py-3 px-5 rounded-lg text-sm font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-[#e6e4df] z-[9999] toast-notification toast-${toast.type} ${
          toast.type === 'error' 
            ? 'bg-[#fdf4f2] text-[#c8442e] border-[#c8442e]/15' 
            : 'bg-white text-[#1c1b1f]'
        }`}>
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
