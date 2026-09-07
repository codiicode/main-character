// GET /api/x/callback?code&state → exchanges the code, reads the X username, sets the session cookie.
import { cookie, signSession } from '../../_lib/session'

type Env = { X_CLIENT_ID?: string; X_CLIENT_SECRET?: string; SESSION_SECRET?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const m = request.headers.get('cookie')?.match(/(?:^|;\s*)main_oauth=([^;]+)/)
  if (!code || !state || !m) return new Response('Login was interrupted. Start again from the endorse page.', { status: 400 })
  const [savedState, verifier, nextEnc] = m[1].split('.')
  if (savedState !== state) return new Response('Login state mismatch. Start again.', { status: 400 })
  if (!env.X_CLIENT_ID || !env.SESSION_SECRET) return new Response('X login is not configured yet.', { status: 503 })

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${url.origin}/api/x/callback`,
    code_verifier: verifier,
    client_id: env.X_CLIENT_ID,
  })
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' }
  if (env.X_CLIENT_SECRET) headers.authorization = 'Basic ' + btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)
  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body })
  if (!tokenRes.ok) return new Response(`X refused the login (${tokenRes.status}). Try again.`, { status: 502 })
  const tok = (await tokenRes.json()) as { access_token: string }

  const meRes = await fetch('https://api.x.com/2/users/me', { headers: { authorization: `Bearer ${tok.access_token}` } })
  if (!meRes.ok) return new Response(`Could not read your X profile (${meRes.status}).`, { status: 502 })
  const me = (await meRes.json()) as { data: { id: string; username: string; name: string } }

  const session = await signSession(env.SESSION_SECRET, { x: me.data.username, xid: me.data.id, name: me.data.name, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  const secure = url.protocol === 'https:'
  const h = new Headers({ location: decodeURIComponent(nextEnc || '/endorse') })
  h.append('set-cookie', cookie('main_session', session, 7 * 86400, secure))
  h.append('set-cookie', cookie('main_oauth', '', 0, secure))
  return new Response(null, { status: 302, headers: h })
}
