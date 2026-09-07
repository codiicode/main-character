/// <reference types="@cloudflare/workers-types" />
// GET /api/logo/<id> → the uploaded image, cached for a year (ids are content hashes).
type Env = { MAIN_KV?: KVNamespace }

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = String(params.id || '')
  if (!/^[0-9a-f]{32}\.(png|jpg|webp)$/.test(id) || !env.MAIN_KV) return new Response('not found', { status: 404 })
  const { value, metadata } = await env.MAIN_KV.getWithMetadata<{ type?: string }>(`logo:${id}`, 'arrayBuffer')
  if (!value) return new Response('not found', { status: 404 })
  const type = metadata?.type || (id.endsWith('.png') ? 'image/png' : id.endsWith('.webp') ? 'image/webp' : 'image/jpeg')
  return new Response(value, { headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*' } })
}
