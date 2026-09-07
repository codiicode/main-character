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

export const pnlFor = (k: Kol, w: Window) => k.pnl[w] ?? 0
export const hueFor = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
