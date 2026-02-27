/**
 * Notifications - animated join/leave toasts
 */
import { useState, useEffect, useRef } from 'react'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const idRef = useRef(0)

  const addNotification = ({ type, message }) => {
    const id = ++idRef.current
    setNotifications(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3500)
  }

  return { notifications, addNotification }
}

export default function Notifications({ notifications }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map(n => (
        <div
          key={n.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass
                     animate-slide-in-right text-sm font-medium"
          style={{
            borderColor: n.type === 'join'
              ? 'rgba(0,255,204,0.3)'
              : n.type === 'error'
              ? 'rgba(248,113,113,0.3)'
              : 'rgba(191,95,255,0.3)',
          }}
        >
          <span style={{
            color: n.type === 'join' ? '#00ffcc'
                 : n.type === 'error' ? '#f87171'
                 : '#bf5fff',
          }}>
            {n.type === 'join' ? '→' : n.type === 'error' ? '⚠' : '←'}
          </span>
          <span className="text-slate-300">{n.message}</span>
        </div>
      ))}
    </div>
  )
}
