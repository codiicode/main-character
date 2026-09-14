// GET /api/health → can the edge reach the chain RPC? Reports chain id, latest block and the raw error if not.
import { jsonResponse } from '../_lib/fomo.js'

type Env = { RPC_URL?: string; MAIN_LAUNCHER?: string; MAIN_KV?: KVNamespace }

async function rpc(url: string, method: string, params: unknown[] = []) {
  const t0 = Date.now()
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
  const text = await r.text()
  return { status: r.status, ms: Date.now() - t0, body: text.slice(0, 300) }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const url = env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'
  // Never echo the provider key.
  const masked = url.replace(/(\/v2\/|dkey=)[^&/?]+/, '$1***')
  const out: Record<string, unknown> = { rpc: masked, launcher: env.MAIN_LAUNCHER ?? null, kv: !!env.MAIN_KV }
  try {
    out.chainId = await rpc(url, 'eth_chainId')
    out.block = await rpc(url, 'eth_blockNumber')
  } catch (e) {
    out.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return jsonResponse(out)
}
