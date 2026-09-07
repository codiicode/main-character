import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '../lib/chain'

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; theme?: string; callback: (t: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void }) => string
  remove: (id: string) => void
}

/** Cloudflare Turnstile widget. Calls onToken with a fresh token, or '' when it expires. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let id: string | null = null
    let cancelled = false
    const mount = () => {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile
      if (!ts || !ref.current || cancelled) return
      id = ts.render(ref.current, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) mount()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = mount
      document.head.appendChild(s)
    }
    return () => {
      cancelled = true
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile
      if (id && ts) ts.remove(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div ref={ref} className="min-h-[65px]" />
}
