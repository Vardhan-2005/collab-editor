/**
 * App – lightweight SPA router (no react-router dependency)
 *
 * Routes:
 *   /              → LandingPage  (hero, create/join CTAs)
 *   /room/:roomId  → EditorPage   (the actual editor)
 *
 * Session data (userId, username) is kept in sessionStorage so a page
 * refresh inside a room restores the user without re-asking for a name.
 * The roomId is always read from the URL so deep-links work correctly.
 */
import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import EditorPage  from './pages/EditorPage'

const SESSION_KEY = 'codesync_user' // stores { userId, username } only

function getPath() {
  return window.location.pathname
}

export default function App() {
  const [path, setPath]       = useState(getPath)
  const [userData, setUserData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onPop = () => setPath(getPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /** Navigate programmatically and update React state */
  function navigate(to) {
    window.history.pushState(null, '', to)
    setPath(to)
  }

  /**
   * Called by LandingPage once a user has logged in and chosen/created a room.
   * Saves user identity and navigates to the editor URL.
   */
  function handleEnterRoom({ userId, username, roomId }) {
    const user = { userId, username }
    setUserData(user)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    navigate(`/room/${roomId}`)
  }

  /** Called by EditorPage's "Leave" button */
  function handleLeave() {
    navigate('/')
  }

  // ── Route matching ───────────────────────────────────────
  const roomMatch = path.match(/^\/room\/([A-Z0-9]{1,12})$/i)

  if (roomMatch) {
    const roomId = roomMatch[1].toUpperCase()

    // If user data is missing (e.g. direct deep-link with no session),
    // send them back to the landing page to pick a username first.
    if (!userData) {
      return (
        <LandingPage
          onEnterRoom={handleEnterRoom}
          intendedRoomId={roomId}
        />
      )
    }

    return (
      <EditorPage
        user={{ ...userData, roomId }}
        onLeave={handleLeave}
      />
    )
  }

  // Default: landing page
  return <LandingPage onEnterRoom={handleEnterRoom} />
}
