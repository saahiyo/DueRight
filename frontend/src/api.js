import { auth, isFirebaseAuthEnabled } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getSessionToken() {
  if (!isFirebaseAuthEnabled()) {
    return 'mock-token'
  }
  const user = auth.currentUser
  if (!user) return ''
  return user.getIdToken()
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getSessionToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  })
  
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED')
  }
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = Array.isArray(body.detail)
      ? body.detail.map((d) => d.msg).join(', ')
      : body.detail
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  list: () => request('/deadlines'),
  createFromText: (text) =>
    request('/deadlines', { method: 'POST', body: JSON.stringify({ text }) }),
  createManual: (payload) =>
    request('/deadlines', { method: 'POST', body: JSON.stringify(payload) }),
  draftAction: (id) =>
    request(`/deadlines/${id}/draft-action`, { method: 'POST' }),
  updateStatus: (id, status) =>
    request(`/deadlines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remove: (id) => request(`/deadlines/${id}`, { method: 'DELETE' }),
}
