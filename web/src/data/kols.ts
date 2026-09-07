import { useEffect, useState } from 'react'

export type Window = '24h' | '7d' | '30d' | 'all'

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
  pnl: Partial<Record<Window, number>>
  rank: Partial<Record<Window, number>>
  volume: Partial<Record<Window, number>>
}

type Payload = { syncedAt: string; source: string; count: number; kols: Kol[] }

let cache: Payload | null = null
let inflight: Promise<Payload> | null = null

export function loadKols(): Promise<Payload> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetch('/data/kols.json')
      .then((r) => {
        if (!r.ok) throw new Error(`kols.json HTTP ${r.status}`)
        return r.json() as Promise<Payload>
      })
      .then((p) => {
        cache = p
        return p
      })
  }
  return inflight
}

export function useKols() {
  const [data, setData] = useState<Payload | null>(cache)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (cache) return
    loadKols().then(setData).catch((e) => setError(String(e)))
  }, [])
  return { kols: data?.kols ?? [], syncedAt: data?.syncedAt ?? null, loading: !data && !error, error }
}

/** Handles looked up on demand this session, merged on top of the leaderboard snapshot. */
const resolved = new Map<string, Kol>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export type ResolveResult = { kol: Kol | null; candidates?: string[]; error?: string }

export async function resolveKol(handle: string): Promise<ResolveResult> {
  const h = handle.trim().replace(/^@/, '')
  if (!h) return { kol: null, error: 'Enter a FOMO handle.' }
  // A local record is only trusted when it carries a wallet; otherwise ask FOMO again.
  const local = [...(cache?.kols ?? []), ...resolved.values()].find((k) => k.handle.toLowerCase() === h.toLowerCase())
  if (local?.wallets.evm) return { kol: local }
  try {
    const get = async (fresh: boolean) => {
      const r = await fetch(`/api/resolve?handle=${encodeURIComponent(h)}${fresh ? "&fresh=1" : ""}`)
      return { r, body: (await r.json()) as ResolveResult }
    }
    let { r, body } = await get(false)
    // Empty or wallet-less answer: bypass caches once, the profile endpoint usually has the wallet.
    if (r.ok && (!body.kol || !body.kol.wallets.evm)) ({ r, body } = await get(true))
    if (!r.ok) return { kol: null, error: body.error ?? `Lookup failed (${r.status})` }
    if (body.kol) {
      resolved.set(body.kol.handle.toLowerCase(), body.kol)
      notify()
    }
    return body
  } catch {
    return { kol: null, error: 'Lookup failed, check your connection.' }
  }
}

/** Leaderboard snapshot plus anything resolved on demand. */
export function useAllKols() {
  const base = useKols()
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  if (resolved.size === 0) return base
  // Freshly resolved records win over the snapshot (they may carry a wallet the snapshot lacked).
  const merged = base.kols.map((k) => resolved.get(k.handle.toLowerCase()) ?? k)
  const extra = [...resolved.values()].filter((r) => !base.kols.some((k) => k.handle.toLowerCase() === r.handle.toLowerCase()))
  return { ...base, kols: [...merged, ...extra] }
}

export const pnlFor = (k: Kol, w: Window) => k.pnl[w] ?? 0
export const hueFor = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
