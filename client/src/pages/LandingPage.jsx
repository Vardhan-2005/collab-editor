/**
 * LandingPage – hero page at "/"
 *
 * Shown before the user has a username. Has two primary CTAs:
 *   • Create Room  → asks for username, then creates a room and navigates
 *   • Join Room    → asks for username + room ID, then navigates
 *
 * All navigation is done via window.history so the SPA router in App.jsx
 * picks up the new path without a hard refresh.
 */
import { useState } from 'react'
import { api } from '../utils/api'

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Instant sync',
    body: 'Every keystroke propagated in real time via WebSockets.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Live presence',
    body: 'See who\'s in the room with color-coded cursors and typing indicators.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: 'Monaco editor',
    body: 'Full VS Code engine — syntax highlighting, folding, autocomplete.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: 'Auto-saved',
    body: 'Sessions persist to SQLite every 5 s. Refresh without losing work.',
  },
]

export default function LandingPage({ onEnterRoom }) {
  // modal: null | 'create' | 'join'
  const [modal, setModal] = useState(null)
  const [username, setUsername] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function openModal(type) {
    setModal(type)
    setError('')
    setUsername('')
    setRoomInput('')
  }
  function closeModal() { setModal(null); setError('') }

  async function handleCreate(e) {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    setError(''); setLoading(true)
    try {
      const userData = await api.login(name)
      const { roomId } = await api.createRoom(userData.userId)
      onEnterRoom({ ...userData, roomId })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    const name = username.trim()
    const id = roomInput.trim().toUpperCase()
    if (!name || !id) return
    setError(''); setLoading(true)
    try {
      const userData = await api.login(name)
      await api.getRoom(id) // validate the room exists
      onEnterRoom({ ...userData, roomId: id })
    } catch (err) {
      setError(err.message.includes('not found') || err.message.includes('404')
        ? 'Room not found. Double-check the ID.'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col overflow-hidden relative">

      {/* ── Animated gradient background ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large slow orbs */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[80px] animate-float"
             style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.07] blur-[100px]"
             style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[60px] animate-pulse-glow"
             style={{ background: 'radial-gradient(circle, #06b6d4, #8b5cf6, transparent)' }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)',
               backgroundSize: '60px 60px',
             }} />
      </div>

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <span className="font-semibold text-white tracking-tight">
            Code<span style={{ color: '#06b6d4' }}>Sync</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal('join')}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
          >
            Join room
          </button>
          <button
            onClick={() => openModal('create')}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                       hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: '#fff' }}
          >
            Create room
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8
                        border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Real-time · Zero setup · No login required
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.1] mb-6 animate-fade-in"
            style={{ animationDelay: '80ms', animationFillMode: 'both', opacity: 0 }}>
          Code together,{' '}
          <span className="relative inline-block">
            <span style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              live.
            </span>
          </span>
        </h1>

        <p className="max-w-xl text-lg text-slate-400 leading-relaxed mb-12 animate-fade-in"
           style={{ animationDelay: '160ms', animationFillMode: 'both', opacity: 0 }}>
          Spin up a room in seconds. Share the ID. Everyone edits the same file
          in real time — no installs, no accounts, no friction.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in"
             style={{ animationDelay: '240ms', animationFillMode: 'both', opacity: 0 }}>

          <button
            onClick={() => openModal('create')}
            className="group relative w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-white text-sm
                       transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]
                       hover:shadow-[0_0_32px_rgba(6,182,212,0.45)]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}
          >
            <span className="relative flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create a room
            </span>
          </button>

          <button
            onClick={() => openModal('join')}
            className="group w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-sm
                       border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]
                       hover:bg-white/5 hover:shadow-[0_0_24px_rgba(139,92,246,0.3)]"
            style={{ borderColor: 'rgba(139,92,246,0.4)', color: '#a78bfa' }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Join with room ID
            </span>
          </button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-xs text-slate-600 animate-fade-in"
           style={{ animationDelay: '320ms', animationFillMode: 'both', opacity: 0 }}>
          Rooms auto-expire after inactivity · Sessions auto-saved every 5 s
        </p>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl animate-fade-in"
             style={{ animationDelay: '400ms', animationFillMode: 'both', opacity: 0 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group p-5 rounded-xl border border-white/5 bg-white/[0.02]
                         hover:border-cyan-500/20 hover:bg-white/[0.04]
                         transition-all duration-300 text-left"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4
                              bg-gradient-to-br from-cyan-500/10 to-violet-500/10
                              text-cyan-400 group-hover:text-cyan-300 transition-colors">
                {f.icon}
              </div>
              <p className="text-sm font-medium text-white mb-1">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-6 text-xs text-slate-700 border-t border-white/5">
        CodeSync · Built with Flask + React + Monaco
      </footer>

      {/* ── Modal Overlay ────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="animate-fade-in w-full max-w-sm rounded-2xl p-8
                          border border-white/10 bg-[#0d1629]
                          shadow-[0_0_60px_rgba(6,182,212,0.1)]">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {modal === 'create' ? 'Create a room' : 'Join a room'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modal === 'create'
                    ? 'Get a unique room ID to share'
                    : 'Enter an existing room ID'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={modal === 'create' ? handleCreate : handleJoin} className="space-y-4">

              {/* Username field — always shown */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">
                  Your handle
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. ghostcoder"
                  maxLength={32}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm text-white font-mono
                             bg-[#0a0f1e] border border-white/10
                             focus:outline-none focus:border-cyan-500/50
                             transition-colors placeholder-slate-700"
                />
              </div>

              {/* Room ID field — only for join */}
              {modal === 'join' && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A3B9F2D1"
                    maxLength={8}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white font-mono uppercase tracking-widest
                               bg-[#0a0f1e] border border-white/10
                               focus:outline-none focus:border-violet-500/50
                               transition-colors placeholder-slate-700"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 font-mono animate-fade-in
                                px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/20">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || (modal === 'join' && !roomInput.trim())}
                className="w-full py-3.5 rounded-xl font-medium text-sm text-white mt-2
                           transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
                           hover:shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:scale-[1.01]"
                style={{ background: modal === 'create'
                  ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)'
                  : 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <LoadSpinner /> {modal === 'create' ? 'Creating...' : 'Joining...'}
                    </span>
                  : modal === 'create' ? '✦ Create & enter room' : '→ Enter room'
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
