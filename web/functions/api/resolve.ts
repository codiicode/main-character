// GET /api/resolve?handle=<fomo handle>
// Looks a FOMO trader up on demand (1 fomoapi credit per uncached handle). Cached at the edge for 15 minutes.
import { jsonResponse, normalizeHandle, resolveHandle } from '../_lib/fomo'

type Env = { FOMOAPI_KEY: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const handle = normalizeHandle(url.searchParams.get('handle'))
  if (!handle) return jsonResponse({ error: 'Enter a FOMO handle, 2 to 32 letters, numbers, dots or underscores.' }, 400)
  if (!env.FOMOAPI_KEY) return jsonResponse({ error: 'Lookup is not configured.' }, 503)

  const cache = caches.default
  const cacheKey = new Request(`${url.origin}/api/resolve?handle=${handle.toLowerCase()}`, { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  try {
    const { kol, candidates } = await resolveHandle(handle, env.FOMOAPI_KEY)
    const res = jsonResponse(kol ? { kol } : { kol: null, candidates }, 200, 900)
    await cache.put(cacheKey, res.clone())
    return res
  } catch (e) {
    return jsonResponse({ error: 'FOMO lookup failed, try again in a moment.' }, 502)
  }
}
