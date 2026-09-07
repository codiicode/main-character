// GET /api/img?u=<fomo profile pic url> → same bytes with CORS, so share cards can draw avatars on a canvas.
const ALLOWED = ['prod-fomo-profile-pics.s3.amazonaws.com', 'token-media.defined.fi']

export const onRequestGet: PagesFunction = async ({ request }) => {
  const u = new URL(request.url).searchParams.get('u')
  let target: URL
  try {
    target = new URL(u ?? '')
  } catch {
    return new Response('bad url', { status: 400 })
  }
  if (target.protocol !== 'https:' || !ALLOWED.includes(target.hostname)) return new Response('host not allowed', { status: 403 })
  const cache = caches.default
  const key = new Request(target.toString())
  let res = await cache.match(key)
  if (!res) {
    const up = await fetch(target.toString(), { cf: { cacheTtl: 86400 } } as RequestInit)
    if (!up.ok) return new Response('upstream ' + up.status, { status: 502 })
    res = new Response(up.body, { status: 200, headers: { 'content-type': up.headers.get('content-type') ?? 'image/jpeg', 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*' } })
    await cache.put(key, res.clone())
  }
  return res
}
