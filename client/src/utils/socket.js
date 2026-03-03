/**
 * Socket.IO client singleton
 * Ensures only one connection is maintained across the app
 */

import { io } from 'socket.io-client'

// Use the dedicated socket server URL; fall back to API URL if only one is set
const SERVER_URL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL

if (!SERVER_URL) {
  throw new Error("VITE_SERVER_URL is not defined")
}

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'], // force websocket (cleaner for production)
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect()
  }
}