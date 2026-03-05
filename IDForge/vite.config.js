import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AutomateID/',   // ← PUT YOUR EXACT REPO NAME HERE
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})