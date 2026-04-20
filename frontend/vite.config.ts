import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const frontendPort = Number(process.env.VITE_PORT || process.env.FRONTEND_PORT || 8080)
const backendPort = process.env.BACKEND_PORT || '8000'
const apiTarget = process.env.VITE_API_TARGET || `http://localhost:${backendPort}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: frontendPort,
    strictPort: true, // 如果端口被占用则报错，而不是自动切换
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})
