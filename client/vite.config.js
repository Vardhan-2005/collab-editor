import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // historyApiFallback: Vite's dev server returns index.html for unknown
    // routes so client-side navigation to /room/XXXX works without a 404.
    historyApiFallback: true,
    proxy: {
      // Proxy REST API calls to Flask backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.IO upgrade requests to Flask
      '/socket.io': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
