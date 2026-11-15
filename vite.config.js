import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'bus.svg', 'logos/*.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MiB
      },
      manifest: {
        name: 'Prise de Service - Seine-Sud-Est',
        short_name: 'SSE Service',
        description: 'Pupitre et horaires en direct pour conducteurs de bus Roblox Seine-Sud-Est',
        theme_color: '#0B1528',
        background_color: '#0B1528',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/logos/134.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
})
