/**
 * useSocket - manages socket.io connection and room state
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket'

export function useSocket({ roomId, userId, username, onCodeUpdate, onNotification }) {
  const [activeUsers, setActiveUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState({}) // userId -> username
  const [myColor, setMyColor] = useState('#00ffcc')
  const typingTimeoutRef = useRef({})
  const isLocalChange = useRef(false) // prevents echo loop

  useEffect(() => {
    if (!roomId || !userId) return

    const socket = connectSocket()

    // ── Join room ─────────────────────────────────────────────
    socket.emit('join_room', { roomId, userId, username })

    // ── Handlers ─────────────────────────────────────────────
    socket.on('room_joined', ({ color, initialContent, activeUsers: users }) => {
      setMyColor(color)
      setActiveUsers(users)
      // Load initial content without triggering a broadcast
      isLocalChange.current = true
      onCodeUpdate?.(initialContent, true) // true = initial load
      setTimeout(() => { isLocalChange.current = false }, 100)
    })

    socket.on('user_joined', ({ username: name, activeUsers: users }) => {
      setActiveUsers(users)
      onNotification?.({ type: 'join', message: `${name} joined` })
    })

    socket.on('user_left', ({ username: name, activeUsers: users }) => {
      setActiveUsers(users)
      onNotification?.({ type: 'leave', message: `${name} left` })
    })

    socket.on('code_update', ({ content }) => {
      // Mark as remote to prevent re-broadcast
      isLocalChange.current = true
      onCodeUpdate?.(content, false)
      setTimeout(() => { isLocalChange.current = false }, 50)
    })

    socket.on('user_typing', ({ userId: uid, username: uname, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) return { ...prev, [uid]: uname }
        const next = { ...prev }
        delete next[uid]
        return next
      })
      // Auto-clear if typing stop event missed
      if (isTyping) {
        clearTimeout(typingTimeoutRef.current[uid])
        typingTimeoutRef.current[uid] = setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[uid]; return n })
        }, 3000)
      }
    })

    socket.on('error', ({ message }) => {
      onNotification?.({ type: 'error', message })
    })

    return () => {
      socket.off('room_joined')
      socket.off('user_joined')
      socket.off('user_left')
      socket.off('code_update')
      socket.off('user_typing')
      socket.off('error')
      disconnectSocket()
    }
  }, [roomId, userId, username])

  /** Emit code change — skipped if change originated remotely */
  const emitCodeChange = useCallback((content) => {
    if (isLocalChange.current) return
    getSocket().emit('code_change', { content })
  }, [])

  let typingEmitTimeout = useRef(null)
  let isTypingActive = useRef(false)

  /** Emit typing indicator with debounce */
  const emitTyping = useCallback(() => {
    const socket = getSocket()
    if (!isTypingActive.current) {
      socket.emit('typing_start', {})
      isTypingActive.current = true
    }
    clearTimeout(typingEmitTimeout.current)
    typingEmitTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', {})
      isTypingActive.current = false
    }, 1500)
  }, [])

  return { activeUsers, typingUsers, myColor, emitCodeChange, emitTyping }
}
