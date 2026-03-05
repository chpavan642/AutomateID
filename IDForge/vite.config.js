import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Replace 'idcard-app' with YOUR actual GitHub repo name
  base: '/IDForge/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})