import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeHandle, resolveHandle } from './functions/_lib/fomo.js'
import { onRequestPost as freeLaunch } from './functions/api/free-launch.js'

const readEnv = (file: string) => {
  try {
    const txt = readFileSync(resolve(__dirname, file), 'utf8')
    return Object.fromEntries(txt.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('=').map((s) => s.trim())))
  } catch {
    return {} as Record<string, string>
  }
}

/** Dev-only stand-ins for the Cloudflare Pages Functions, so the app works on `npm run dev`. */
function devApi(): Plugin {
  const root = readEnv('../.env')
  const key = root.FOMOAPI_KEY ?? ''
  const mem = new Map<string, { body: string; at: number }>()
  return {
    name: 'main-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/img', async (req, res) => {
        const u = new URL(req.url ?? '', 'http://localhost').searchParams.get('u') ?? ''
        try {
          const up = await fetch(u)
          res.setHeader('content-type', up.headers.get('content-type') ?? 'image/jpeg')
          res.setHeader('access-control-allow-origin', '*')
          res.end(Buffer.from(await up.arrayBuffer()))
        } catch {
          res.statusCode = 502
          res.end()
        }
      })

      // Dev stand-in for /api/upload and /api/logo/:id (memory instead of KV).
      const logos = new Map<string, { type: string; bytes: Buffer }>()
      server.middlewares.use('/api/upload', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const bytes = Buffer.concat(chunks)
        const type = (req.headers['content-type'] || 'image/jpeg').split(';')[0]
        const id = require('node:crypto').createHash('sha256').update(bytes).digest('hex').slice(0, 32) + (type === 'image/png' ? '.png' : '.jpg')
        logos.set(id, { type, bytes })
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ url: `http://localhost:5173/api/logo/${id}`, id }))
      })
      server.middlewares.use('/api/logo', (req, res) => {
        const id = (req.url ?? '').replace(/^//, '')
        const l = logos.get(id)
        if (!l) { res.statusCode = 404; res.end(); return }
        res.setHeader('content-type', l.type)
        res.end(l.bytes)
      })

      // Same handler as production; env from .env.local, anvil account #2 as relayer, no KV / Turnstile.
      server.middlewares.use('/api/free-launch', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const local = readEnv('.env.local')
        const request = new Request('http://localhost:5173/api/free-launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: Buffer.concat(chunks).toString() })
        const env = { FOMOAPI_KEY: key, MAIN_LAUNCHER: local.VITE_MAIN_LAUNCHER, RPC_URL: local.VITE_RPC, RELAYER_PK: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' }
        const out = await (freeLaunch as unknown as (ctx: { request: Request; env: unknown }) => Promise<Response>)({ request, env })
        res.statusCode = out.status
        res.setHeader('content-type', 'application/json')
        res.end(await out.text())
      })

      server.middlewares.use('/api/resolve', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const handle = normalizeHandle(url.searchParams.get('handle'))
        res.setHeader('content-type', 'application/json')
        if (!handle) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Enter a FOMO handle.' }))
          return
        }
        if (!key) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'FOMOAPI_KEY missing in .env' }))
          return
        }
        const k = handle.toLowerCase()
        const fresh = url.searchParams.get('fresh') === '1'
        const cached = mem.get(k)
        if (cached && !fresh && Date.now() - cached.at < 15 * 60_000) {
          res.end(cached.body)
          return
        }
        try {
          const { kol, candidates, creditsRemaining, via } = await resolveHandle(handle, key)
          const body = JSON.stringify(kol ? { kol, via } : { kol: null, candidates })
          mem.set(k, { body, at: Date.now() })
          console.log(`[resolve] ${handle} → ${kol ? `found via ${via}` : 'none'} (credits left ${creditsRemaining})`)
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
