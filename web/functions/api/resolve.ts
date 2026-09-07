// GET /api/resolve?handle=<fomo handle>
// Looks a FOMO trader up on demand. Order: KV (30 days) → edge cache (15 min) → fomoapi (1 credit
// via search, or 11 when the profile endpoint is needed). Misses are cached briefly so typos are cheap.
import { jsonResponse, normalizeHandle, resolveHandle, type Kol } from '../_lib/fomo'

type Env = { FOMOAPI_KEY: string; MAIN_KV?: KVNamespace }

const HIT_TTL = 30 * 86400
const MISS_TTL = 3600

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const handle = normalizeHandle(url.searchParams.get('handle'))
  if (!handle) return jsonResponse({ error: 'Enter a FOMO handle, 2 to 32 letters, numbers, dots or underscores.' }, 400)
  if (!env.FOMOAPI_KEY) return jsonResponse({ error: 'Lookup is not configured.' }, 503)
  const key = `kol:${handle.toLowerCase()}`
  const fresh = url.searchParams.get('fresh') === '1'

  if (env.MAIN_KV && !fresh) {
    const cached = await env.MAIN_KV.get<{ kol: Kol | null; candidates?: string[] }>(key, 'json')
    // A cached hit without a wallet is worth re-checking: the trader may have opened an EVM chain since.
    if (cached && (cached.kol?.wallets.evm || !cached.kol)) return jsonResponse({ ...cached, cached: true }, 200, 900)
  }

  const cache = caches.default
  const cacheKey = new Request(`${url.origin}/api/resolve?handle=${handle.toLowerCase()}`, { method: 'GET' })
  if (!fresh) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }

  try {
    const { kol, candidates, via } = await resolveHandle(handle, env.FOMOAPI_KEY)
    const body = kol ? { kol, via } : { kol: null, candidates }
    const res = jsonResponse(body, 200, 900)
    await cache.put(cacheKey, res.clone())
    if (env.MAIN_KV) await env.MAIN_KV.put(key, JSON.stringify(body), { expirationTtl: kol?.wallets.evm ? HIT_TTL : MISS_TTL })
    return res
  } catch {
    return jsonResponse({ error: 'FOMO lookup failed, try again in a moment.' }, 502)
  }
}
