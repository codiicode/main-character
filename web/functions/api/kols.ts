/// <reference types="@cloudflare/workers-types" />
// GET /api/kols → the latest FOMO leaderboard snapshot written by the cron worker (KV "kols.json").
// 404 when the worker hasn't run yet; the site then falls back to the static /data/kols.json.
type Env = { MAIN_KV?: KVNamespace }

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const body = env.MAIN_KV ? await env.MAIN_KV.get('kols.json') : null
  if (!body) return new Response('not synced yet', { status: 404 })
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}
