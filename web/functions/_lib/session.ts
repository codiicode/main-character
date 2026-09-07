// Tiny HMAC-signed session cookie: { x: "<x username>", xid, exp }. No DB needed.

const enc = new TextEncoder()

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(new Uint8Array(sig))
}

export function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export type Session = { x: string; xid: string; name?: string; exp: number }

export async function signSession(secret: string, s: Session): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(s)))
  return `${body}.${await hmac(secret, body)}`
}

export async function readSession(secret: string, cookieHeader: string | null): Promise<Session | null> {
  const m = cookieHeader?.match(/(?:^|;\s*)main_session=([^;]+)/)
  if (!m) return null
  const [body, sig] = m[1].split('.')
  if (!body || !sig) return null
  if ((await hmac(secret, body)) !== sig) return null
  try {
    const s = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as Session
    if (!s.x || s.exp < Date.now() / 1000) return null
    return s
  } catch {
    return null
  }
}

export function cookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

export async function sha256b64url(s: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))))
}

export function randomToken(n = 32): string {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b64url(b)
}
