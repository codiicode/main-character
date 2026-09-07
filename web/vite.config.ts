import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeHandle, resolveHandle } from './functions/_lib/fomo'

/** Dev-only stand-in for the Cloudflare Pages Function at /api/resolve. Reads FOMOAPI_KEY from ../.env. */
function devApi(): Plugin {
  const key = (() => {
    try {
      const env = readFileSync(resolve(__dirname, '../.env'), 'utf8')
      return env.split(/\r?\n/).find((l) => l.startsWith('FOMOAPI_KEY='))?.split('=')[1]?.trim() ?? ''
    } catch {
      return ''
    }
  })()
  const mem = new Map<string, { body: string; at: number }>()
  return {
    name: 'main-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/resolve', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const handle = normalizeHandle(url.searchParams.get('handle'))
        res.setHeader('content-type', 'application/json')
        if (!handle) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Enter a FOMO handle.' })); return }
        if (!key) { res.statusCode = 503; res.end(JSON.stringify({ error: 'FOMOAPI_KEY missing in .env' })); return }
        const k = handle.toLowerCase()
        const cached = mem.get(k)
        if (cached && Date.now() - cached.at < 15 * 60_000) { res.end(cached.body); return }
        try {
          const { kol, candidates, creditsRemaining } = await resolveHandle(handle, key)
          const body = JSON.stringify(kol ? { kol } : { kol: null, candidates })
          mem.set(k, { body, at: Date.now() })
          console.log(`[resolve] ${handle} → ${kol ? 'found' : 'none'} (credits left ${creditsRemaining})`)
          res.end(body)
        } catch (e) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  server: { port: 5173 },
})
