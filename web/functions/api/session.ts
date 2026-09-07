// GET /api/session → { x, name } or { x: null }.  DELETE /api/session → logout.
import { cookie, readSession } from '../_lib/session'
import { jsonResponse } from '../_lib/fomo'

type Env = { SESSION_SECRET?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) return jsonResponse({ x: null, configured: false })
  const s = await readSession(env.SESSION_SECRET, request.headers.get('cookie'))
  return jsonResponse(s ? { x: s.x, name: s.name ?? null, configured: true } : { x: null, configured: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request }) => {
  const secure = new URL(request.url).protocol === 'https:'
  return new Response(null, { status: 204, headers: { 'set-cookie': cookie('main_session', '', 0, secure) } })
}
