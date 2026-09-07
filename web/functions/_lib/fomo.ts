// Shared FOMO lookup used by the Cloudflare Pages Function (prod) and the Vite dev middleware.
// Resolves any FOMO handle to the same Kol shape the frontend already uses for the leaderboard.

export type Kol = {
  handle: string
  name: string
  avatar: string | null
  description: string
  followers: number
  trades: number
  holdings: number
  clan: string | null
  twitter: string | null
  createdAt: string | null
  wallets: { evm: string | null; solana: string | null; verified: boolean }
  pnl: Partial<Record<'24h' | '7d' | '30d' | 'all', number>>
  rank: Partial<Record<'24h' | '7d' | '30d' | 'all', number>>
  volume: Partial<Record<'24h' | '7d' | '30d' | 'all', number>>
}

const HANDLE_RE = /^[a-z0-9_.\-]{2,32}$/i

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null
  const h = raw.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?fomo\.family\/(u|user|profile)\//i, '').replace(/[/?#].*$/, '')
  return HANDLE_RE.test(h) ? h : null
}

type SearchResult = {
  handle: string
  displayName?: string
  avatar?: string | null
  bio?: string | null
  description?: string | null
  followers?: number
  trades?: number
  holdings?: number
  clan?: { name?: string } | null
  twitter?: string | null
  createdAt?: string | null
  wallets?: { evm?: string | null; solana?: string | null; verified?: boolean }
  pnlUsd?: number
  rank?: number
}

export async function resolveHandle(handle: string, apiKey: string): Promise<{ kol: Kol | null; creditsRemaining: string | null; candidates: string[] }> {
  const url = `https://api.fomoapi.io/v2/search?q=${encodeURIComponent(handle)}&type=traders&limit=10`
  const res = await fetch(url, { headers: { authorization: `Bearer ${apiKey}` } })
  const creditsRemaining = res.headers.get('x-credits-remaining')
  if (!res.ok) throw new Error(`fomoapi ${res.status}`)
  const data = (await res.json()) as { results?: SearchResult[] }
  const results = data.results ?? []
  const exact = results.find((r) => r.handle.toLowerCase() === handle.toLowerCase())
  const candidates = results.filter((r) => r !== exact).map((r) => r.handle).slice(0, 5)
  if (!exact) return { kol: null, creditsRemaining, candidates }
  const kol: Kol = {
    handle: exact.handle,
    name: exact.displayName || exact.handle,
    avatar: exact.avatar || null,
    description: exact.bio || exact.description || '',
    followers: exact.followers ?? 0,
    trades: exact.trades ?? 0,
    holdings: exact.holdings ?? 0,
    clan: exact.clan?.name || null,
    twitter: exact.twitter || null,
    createdAt: exact.createdAt || null,
    wallets: { evm: exact.wallets?.evm || null, solana: exact.wallets?.solana || null, verified: !!exact.wallets?.verified },
    pnl: exact.pnlUsd != null ? { '24h': exact.pnlUsd } : {},
    rank: exact.rank != null ? { '24h': exact.rank } : {},
    volume: {},
  }
  return { kol, creditsRemaining, candidates }
}

export function jsonResponse(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  })
}
