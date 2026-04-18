import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
      },
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true
      }
    }
  }
})
