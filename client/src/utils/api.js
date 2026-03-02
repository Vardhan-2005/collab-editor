/**
 * API helpers for REST endpoints
 */

const BASE = `${import.meta.env.VITE_API_URL}/api`

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'Request failed')

  return data
}

export const api = {
  login: (username) =>
    request('/auth/login', { method: 'POST', body: { username } }),

  createRoom: (userId) =>
    request('/rooms/create', { method: 'POST', body: { userId } }),

  getRoom: (roomId) =>
    request(`/rooms/${roomId}`),

  saveSession: (roomId, content) =>
    request(`/rooms/${roomId}/save`, { method: 'POST', body: { content } }),
}