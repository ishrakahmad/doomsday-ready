import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API runs separately; requests to /api are proxied to it.
export default defineConfig({
  plugins: [react()],
  preview: {
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000',
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000',
    },
  },
})
