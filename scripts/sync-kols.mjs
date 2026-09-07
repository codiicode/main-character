// Fetches FOMO leaderboards via fomoapi.io and writes web/public/data/kols.json
// Usage: node scripts/sync-kols.mjs   (reads FOMOAPI_KEY from .env in repo root)
// Cost: 1 credit per window = 4 credits per run.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim())),
)
const KEY = process.env.FOMOAPI_KEY || env.FOMOAPI_KEY
if (!KEY) throw new Error('FOMOAPI_KEY missing')

const WINDOWS = ['24h', '7d', '30d', 'all']
const BASE = 'https://api.fomoapi.io/v2/leaderboard/'

const byHandle = new Map()
let remaining = null
for (const w of WINDOWS) {
  const res = await fetch(`${BASE}${w}?limit=500`, { headers: { authorization: `Bearer ${KEY}` } })
  if (!res.ok) throw new Error(`${w}: HTTP ${res.status} ${await res.text()}`)
  remaining = res.headers.get('x-credits-remaining')
  const data = await res.json()
  for (const t of data.traders) {
    const key = t.handle.toLowerCase()
    const cur = byHandle.get(key) ?? {
      handle: t.handle,
      name: t.displayName || t.handle,
      avatar: t.avatar || null,
      description: t.description || '',
      followers: t.followers ?? 0,
      trades: t.trades ?? 0,
      holdings: t.holdings ?? 0,
      clan: t.clan?.name || null,
      twitter: t.twitter || null,
      createdAt: t.createdAt || null,
      wallets: { evm: t.wallets?.evm || null, solana: t.wallets?.solana || null, verified: !!t.wallets?.verified },
      pnl: {},
      rank: {},
      volume: {},
    }
    cur.pnl[w] = t.pnlUsd ?? 0
    cur.rank[w] = t.rank
    cur.volume[w] = t.volumeUsd ?? 0
    // keep the freshest social numbers
    cur.followers = Math.max(cur.followers, t.followers ?? 0)
    cur.trades = Math.max(cur.trades, t.trades ?? 0)
    if (!cur.avatar && t.avatar) cur.avatar = t.avatar
    if (!cur.wallets.evm && t.wallets?.evm) cur.wallets.evm = t.wallets.evm
    byHandle.set(key, cur)
  }
  console.log(`${w}: ${data.traders.length} traders`)
}

const kols = [...byHandle.values()].sort((a, b) => (b.pnl['7d'] ?? 0) - (a.pnl['7d'] ?? 0))
const out = { syncedAt: new Date().toISOString(), source: 'fomoapi.io', count: kols.length, kols }
const outPath = join(root, 'web', 'public', 'data', 'kols.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out))
console.log(`wrote ${kols.length} KOLs (${kols.filter((k) => k.wallets.evm).length} with EVM wallet) → ${outPath}. Credits remaining: ${remaining}`)
