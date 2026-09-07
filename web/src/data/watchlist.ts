import { useEffect, useState } from 'react'

// Per-browser watchlist. Keys: "kol:<handle>" | "coin:<address>". Push notifications need a backend later.
const KEY = 'main.watchlist.v1'
const listeners = new Set<() => void>()

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}
function write(s: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l())
}

export const watchKey = (kind: 'kol' | 'coin', id: string) => `${kind}:${id.toLowerCase()}`

export function useWatchlist() {
  const [set, setSet] = useState<Set<string>>(read)
  useEffect(() => {
    const l = () => setSet(read())
    listeners.add(l)
    window.addEventListener('storage', l)
    return () => {
      listeners.delete(l)
      window.removeEventListener('storage', l)
    }
  }, [])
  return {
    has: (k: string) => set.has(k),
    toggle: (k: string) => {
      const n = read()
      if (n.has(k)) n.delete(k)
      else n.add(k)
      write(n)
    },
    kols: [...set].filter((k) => k.startsWith('kol:')).map((k) => k.slice(4)),
    coins: [...set].filter((k) => k.startsWith('coin:')).map((k) => k.slice(5)),
    size: set.size,
  }
}
