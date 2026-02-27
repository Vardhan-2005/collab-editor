/**
 * LoginPage - username entry and room create/join
 */
import { useState, useRef } from 'react'
import { api } from '../utils/api'

const PLACEHOLDER_CODE = `// Welcome to CodeSync
// Real-time collaborative code editor

function greet(name) {
  return \`Hello, \${name}! Let's code together.\`
}

console.log(greet("World"))`

export default function LoginPage({ onEnterRoom }) {
  const [step, setStep] = useState('username') // 'username' | 'room'
  const [username, setUsername] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username.trim())
      setUserData(data)
      setStep('room')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRoom() {
    setError('')
    setLoading(true)
    try {
      const { roomId } = await api.createRoom(userData.userId)
      onEnterRoom({ ...userData, roomId })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault()
    const id = roomInput.trim().toUpperCase()
    if (!id) return
    setError('')
    setLoading(true)
    try {
      // Verify room exists
      await api.getRoom(id)
      onEnterRoom({ ...userData, roomId: id })
    } catch (err) {
      setError('Room not found. Check the ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
             style={{ background: 'radial-gradient(circle, #00ffcc, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl animate-float"
             style={{ background: 'radial-gradient(circle, #bf5fff, transparent)' }} />
      </div>

      {/* Background code preview */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5 select-none">
        <pre className="font-mono text-xs text-emerald-400 p-8 leading-relaxed whitespace-pre-wrap">
          {PLACEHOLDER_CODE.repeat(6)}
        </pre>
      </div>

      {/* Main Card */}
      <div className="animate-fade-in relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #00ffcc, #06b6d4)' }}>
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-white">
              Code<span className="text-glow-cyan" style={{ color: '#00ffcc' }}>Sync</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm font-light">
            Real-time collaborative code editor
          </p>
        </div>

        <div className="glass rounded-2xl p-8 glow-cyan">
          {step === 'username' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                  Choose your handle
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. ghostcoder, neo, ada"
                  maxLength={32}
                  autoFocus
                  className="w-full bg-base-950 border border-base-600 rounded-xl px-4 py-3.5
                             text-white placeholder-slate-600 font-mono text-sm
                             focus:outline-none focus:border-cyan-glow transition-all duration-300
                             focus:shadow-[0_0_0_1px_rgba(0,255,204,0.3)]"
                  style={{ '--tw-border-color': '#30363d' }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs font-mono animate-fade-in">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full py-3.5 rounded-xl font-medium text-sm text-black
                           transition-all duration-300 relative overflow-hidden
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:shadow-[0_0_24px_rgba(0,255,204,0.4)]"
                style={{ background: 'linear-gradient(135deg, #00ffcc, #06b6d4)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadSpinner /> Entering...
                  </span>
                ) : 'Continue →'}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                     style={{ background: 'linear-gradient(135deg, #00ffcc, #06b6d4)' }}>
                  {userData?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{userData?.username}</p>
                  <button onClick={() => { setStep('username'); setError('') }}
                          className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
                    ← change name
                  </button>
                </div>
              </div>

              {/* Create Room */}
              <div className="space-y-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-medium text-sm text-black
                             transition-all duration-300 hover:scale-[1.02]
                             hover:shadow-[0_0_28px_rgba(0,255,204,0.45)]
                             active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #00ffcc, #06b6d4)' }}
                >
                  {loading ? <span className="flex items-center justify-center gap-2"><LoadSpinner /> Creating...</span>
                           : '✦ Create New Room'}
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-base-600" />
                <span className="text-slate-600 text-xs uppercase tracking-widest">or join</span>
                <div className="flex-1 h-px bg-base-600" />
              </div>

              {/* Join Room */}
              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="ROOM ID"
                  maxLength={8}
                  className="flex-1 bg-base-950 border border-base-600 rounded-xl px-4 py-3
                             text-white placeholder-slate-600 font-mono text-sm uppercase tracking-widest
                             focus:outline-none focus:border-cyan-glow transition-all duration-300
                             focus:shadow-[0_0_0_1px_rgba(0,255,204,0.3)]"
                />
                <button
                  type="submit"
                  disabled={loading || !roomInput.trim()}
                  className="px-5 py-3 rounded-xl border text-sm font-medium
                             transition-all duration-300 hover:bg-white/5
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: 'rgba(0,255,204,0.3)', color: '#00ffcc' }}
                >
                  Join
                </button>
              </form>

              {error && (
                <p className="text-red-400 text-xs font-mono animate-fade-in">{error}</p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          No account needed. Sessions auto-save every 5s.
        </p>
      </div>
    </div>
  )
}

function LoadSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
