import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { processUserSyncRequest } from './api/user-sync.js'

function discordOAuthDevMiddleware(env) {
  return {
    name: 'discord-oauth-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/user-sync', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        const token = env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN
        const urlObj = new URL(req.url, 'http://localhost:5173')
        const query = Object.fromEntries(urlObj.searchParams.entries())

        if (req.method === 'GET') {
          try {
            const result = await processUserSyncRequest({ method: 'GET', query, body: {}, token })
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.data))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        let rawBody = ''
        req.on('data', chunk => { rawBody += chunk })
        req.on('end', async () => {
          try {
            const result = await processUserSyncRequest({
              method: req.method,
              query,
              body: rawBody,
              token
            })
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.data))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      server.middlewares.use('/api/discord-token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let rawBody = ''
        req.on('data', chunk => { rawBody += chunk })
        req.on('end', async () => {
          try {
            const { code, redirectUri } = JSON.parse(rawBody || '{}')
            const clientId = env.VITE_DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID
            const clientSecret = env.DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET

            if (!code || !clientId || !clientSecret) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing OAuth parameters' }))
              return
            }

            const body = new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri
            })

            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: body.toString()
            })

            const tokenData = await tokenRes.json()
            res.statusCode = tokenRes.ok && tokenData.access_token ? 200 : 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(tokenData))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      discordOAuthDevMiddleware(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'bus.svg', 'logos/*.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        manifest: {
          name: 'Prise de Service - Seine-Sud-Est',
          short_name: 'SSE Service',
          description: 'Pupitre et horaires en direct pour conducteurs de bus Roblox Seine-Sud-Est',
          theme_color: '#080226',
          background_color: '#080226',
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
  }
})
