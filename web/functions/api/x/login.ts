// GET /api/x/login?next=/endorse/0x...  → X OAuth 2.0 (PKCE). Needs X_CLIENT_ID (+ X_CLIENT_SECRET for confidential apps).
import { cookie, randomToken, sha256b64url } from '../../_lib/session'

type Env = { X_CLIENT_ID?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.X_CLIENT_ID) return new Response('X login is not configured yet.', { status: 503 })
  const url = new URL(request.url)
  const next = url.searchParams.get('next') || '/endorse'
  const state = randomToken(16)
  const verifier = randomToken(48)
  const challenge = await sha256b64url(verifier)
  const redirect = `${url.origin}/api/x/callback`
  const auth = new URL('https://x.com/i/oauth2/authorize')
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('client_id', env.X_CLIENT_ID)
  auth.searchParams.set('redirect_uri', redirect)
  auth.searchParams.set('scope', 'users.read tweet.read')
  auth.searchParams.set('state', state)
  auth.searchParams.set('code_challenge', challenge)
  auth.searchParams.set('code_challenge_method', 'S256')
  const secure = url.protocol === 'https:'
  const headers = new Headers({ location: auth.toString() })
  headers.append('set-cookie', cookie('main_oauth', `${state}.${verifier}.${encodeURIComponent(next)}`, 600, secure))
  return new Response(null, { status: 302, headers })
}
