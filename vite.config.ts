import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // All requests to /api/* are forwarded to the FastAPI backend.
      // The '/api' prefix is stripped before forwarding so the backend
      // sees /suggest-next-chords  (not /api/suggest-next-chords).
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
