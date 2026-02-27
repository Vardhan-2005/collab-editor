/**
 * useAutoSave - saves editor content to backend every 5 seconds
 */
import { useEffect, useRef } from 'react'
import { api } from '../utils/api'

export function useAutoSave(roomId, getContent) {
  const timerRef = useRef(null)
  const lastSavedRef = useRef('')

  useEffect(() => {
    if (!roomId) return

    timerRef.current = setInterval(async () => {
      const content = getContent()
      if (content === lastSavedRef.current) return // Skip if unchanged

      try {
        await api.saveSession(roomId, content)
        lastSavedRef.current = content
      } catch (err) {
        console.warn('[AutoSave] Failed:', err.message)
      }
    }, 5000)

    return () => clearInterval(timerRef.current)
  }, [roomId])
}
