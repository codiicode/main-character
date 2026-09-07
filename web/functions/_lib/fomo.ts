// Shared FOMO lookup used by the Cloudflare Pages Function (prod) and the Vite dev middleware.
// Resolves any FOMO handle to the same Kol shape the frontend already uses for the leaderboard.
//
// Strategy: /v2/search (1 credit) finds well-known traders; small accounts only show up through
// /v2/users/{handle} (10 credits), which also returns the EVM wallet reliably. We try search first
// and fall back to the user endpoint when there is no exact hit or the hit has no EVM wallet.

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
  pnlUsd?: number | null
  rank?: number
}

type UserResult = SearchResult & {
  userHandle?: string
  profilePictureLink?: string | null
  profile?: { twitter?: string | null; twitterHandle?: string | null; bio?: string | null }
  numTrades?: number
}

function toKol(r: SearchResult & Partial<UserResult>): Kol {
  return {
    handle: r.userHandle || r.handle,
    name: r.displayName || r.userHandle || r.handle,
    avatar: r.avatar || r.profilePictureLink || null,
    description: r.bio || r.description || r.profile?.bio || '',
    followers: r.followers ?? 0,
    trades: r.trades ?? r.numTrades ?? 0,
    holdings: r.holdings ?? 0,
    clan: r.clan?.name || null,
    twitter: r.twitter || r.profile?.twitterHandle || r.profile?.twitter || null,
    createdAt: r.createdAt || null,
    wallets: { evm: r.wallets?.evm || null, solana: r.wallets?.solana || null, verified: !!r.wallets?.verified },
    pnl: r.pnlUsd != null ? { '24h': r.pnlUsd } : {},
    rank: r.rank != null ? { '24h': r.rank } : {},
    volume: {},
  }
}

async function call(path: string, apiKey: string): Promise<{ ok: boolean; status: number; json: unknown; credits: string | null }> {
  const res = await fetch(`https://api.fomoapi.io${path}`, { headers: { authorization: `Bearer ${apiKey}` } })
  const credits = res.headers.get('x-credits-remaining')
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json, credits }
}

export async function resolveHandle(handle: string, apiKey: string): Promise<{ kol: Kol | null; creditsRemaining: string | null; candidates: string[]; via: 'search' | 'user' | 'none' }> {
  let creditsRemaining: string | null = null
  let candidates: string[] = []

  // 1. search, cheap
  const s = await call(`/v2/search?q=${encodeURIComponent(handle)}&type=traders&limit=10`, apiKey)
  creditsRemaining = s.credits ?? creditsRemaining
  if (s.ok) {
    const results = ((s.json as { results?: SearchResult[] })?.results ?? [])
    const exact = results.find((r) => r.handle.toLowerCase() === handle.toLowerCase())
    candidates = results.filter((r) => r !== exact).map((r) => r.handle).slice(0, 5)
    if (exact?.wallets?.evm) return { kol: toKol(exact), creditsRemaining, candidates, via: 'search' }
  }

  // 2. direct profile, finds anyone and carries the EVM wallet
  const u = await call(`/v2/users/${encodeURIComponent(handle)}`, apiKey)
  creditsRemaining = u.credits ?? creditsRemaining
  if (u.ok && u.json && typeof u.json === 'object' && (u.json as UserResult).handle) {
    return { kol: toKol(u.json as UserResult), creditsRemaining, candidates, via: 'user' }
  }
  if (!u.ok && u.status !== 404) throw new Error(`fomoapi ${u.status}`)
  return { kol: null, creditsRemaining, candidates, via: 'none' }
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
