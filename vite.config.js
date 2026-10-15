import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import resourcesFeed from './src/plugins/resourcesFeed.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), resourcesFeed()],
  server: {
    // Allows the dev server to be reached through a tunnel hostname (e.g. loca.lt, trycloudflare.com)
    // for live demos, in addition to localhost.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
