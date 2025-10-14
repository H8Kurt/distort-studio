import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [],
  },
  preload: {
    plugins: [],
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:4000',
      },
    },
  },
})
