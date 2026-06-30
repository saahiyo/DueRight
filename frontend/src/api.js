const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY
  }
  
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  })
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
