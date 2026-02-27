/**
 * Socket.IO client singleton
 * Ensures only one connection is maintained across the app
 */
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect()
  }
}
