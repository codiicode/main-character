/// <reference types="@cloudflare/workers-types" />
// POST /api/upload  (body: image bytes, content-type: image/png|jpeg|webp) → { url }
// Stores the image in KV under its hash and serves it from /api/logo/<id>. Client resizes to 512px first.
import { jsonResponse } from '../_lib/fomo.js'

type Env = { MAIN_KV?: KVNamespace }

const MAX = 600 * 1024
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.MAIN_KV) return jsonResponse({ error: 'Uploads are not configured.' }, 503)
  const type = (request.headers.get('content-type') || '').split(';')[0].trim()
  if (!TYPES.has(type)) return jsonResponse({ error: 'Use a PNG, JPEG or WebP image.' }, 415)
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength === 0) return jsonResponse({ error: 'Empty file.' }, 400)
  if (bytes.byteLength > MAX) return jsonResponse({ error: 'Image is too large after resizing. Try a smaller one.' }, 413)
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
  const id = `${hash}.${ext}`
  await env.MAIN_KV.put(`logo:${id}`, bytes, { metadata: { type } })
  const url = new URL(`/api/logo/${id}`, request.url)
  return jsonResponse({ url: url.toString(), id })
}
