/// <reference types="@cloudflare/workers-types" />
// MAIN cron worker.
//   "7 * * * *"    payouts: sweep + distribute every coin with pending fees above PAYOUT_MIN_ETH
//   "3 */6 * * *"  sync: FOMO leaderboards → KV "kols.json" (served by /api/kols on the site)
// Manual runs: GET /run/payouts or /run/sync with header x-cron-key: <CRON_KEY>.
import { createPublicClient, createWalletClient, http, defineChain, parseAbi, formatEther, parseEther, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export interface Env {
  MAIN_KV: KVNamespace
  MAIN_LAUNCHER: string
  PAYOUT_MIN_ETH: string
  RELAYER_PK: string
  TREASURY_SPLIT?: string
  BUYBACK_VAULT?: string
  RPC_URL?: string
  FOMOAPI_KEY?: string
  CRON_KEY?: string
}

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
})
const PONS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as const

const launcherAbi = parseAbi([
  'function tokenCount() view returns (uint256)',
  'function tokens(uint256) view returns (address)',
  'function splitterOf(address) view returns (address)',
  'function sweepAndDistributeMany(address[] list)',
])
const splitterAbi = parseAbi(['function claimable() view returns (uint256)'])
const treasuryAbi = parseAbi(['function pending() view returns (uint256)', 'function distribute() returns (uint256)'])
const vaultAbi = parseAbi(['function ready() view returns (bool)', 'function buyAndBurn(uint256 minTokensOut) returns (uint256 spent, uint256 burned)'])
const curveAbi = parseAbi(['function quoteFeeBalance() view returns (uint256)', 'function creatorTaxBalance() view returns (uint256)'])
const ponsAbi = parseAbi([
  'function getLaunchedToken(address token) view returns ((address token,address curve,address deployer,address creatorFeeRecipient,address pairToken,uint256 graduationThreshold,uint24 poolFee,int24 tickSpacing,uint16 creatorTaxBps,bool buybackEnabled,uint8 phase,uint256 sweptQuote,uint256 sweptTokens,uint256 sweptAt,bool exists))',
])

function clients(env: Env) {
  const rpc = env.RPC_URL || chain.rpcUrls.default.http[0]
  const pub = createPublicClient({ chain, transport: http(rpc, { retryCount: 4, retryDelay: 1500 }) })
  const account = privateKeyToAccount(env.RELAYER_PK as Hex)
  const wallet = createWalletClient({ account, chain, transport: http(rpc, { retryCount: 4, retryDelay: 1500 }) })
  return { pub, wallet, account }
}

// ------------------------------------------------------------------ payouts

export async function runPayouts(env: Env): Promise<Record<string, unknown>> {
  const { pub, wallet, account } = clients(env)
  const launcher = env.MAIN_LAUNCHER as Address
  const min = parseEther((env.PAYOUT_MIN_ETH || '0.001') as `${number}`)
  const n = Number(await pub.readContract({ address: launcher, abi: launcherAbi, functionName: 'tokenCount' }))
  const due: Address[] = []
  const skipped: string[] = []
  for (let i = 0; i < n; i++) {
    const token = await pub.readContract({ address: launcher, abi: launcherAbi, functionName: 'tokens', args: [BigInt(i)] })
    const [splitter, info] = await Promise.all([
      pub.readContract({ address: launcher, abi: launcherAbi, functionName: 'splitterOf', args: [token] }),
      pub.readContract({ address: PONS, abi: ponsAbi, functionName: 'getLaunchedToken', args: [token] }),
    ])
    let pending = await pub.readContract({ address: splitter, abi: splitterAbi, functionName: 'claimable' })
    if (Number(info.phase) === 0) {
      // still on the curve: creator side of the unswept base fee (70%) plus the whole creator tax
      const [fee, tax] = await Promise.all([
        pub.readContract({ address: info.curve, abi: curveAbi, functionName: 'quoteFeeBalance' }).catch(() => 0n),
        pub.readContract({ address: info.curve, abi: curveAbi, functionName: 'creatorTaxBalance' }).catch(() => 0n),
      ])
      pending += (fee * 7n) / 10n + tax
    }
    if (pending >= min) due.push(token)
    else skipped.push(`${token.slice(0, 8)}:${formatEther(pending)}`)
  }
  const result: Record<string, unknown> = { coins: n, due: due.length, skipped: skipped.length, relayer: account.address, balance: formatEther(await pub.getBalance({ address: account.address })) }
  const hashes: string[] = []
  for (let i = 0; i < due.length; i += 20) {
    const batch = due.slice(i, i + 20)
    const hash = await wallet.writeContract({ address: launcher, abi: launcherAbi, functionName: 'sweepAndDistributeMany', args: [batch] })
    await pub.waitForTransactionReceipt({ hash })
    hashes.push(hash)
  }
  // Forward the platform share (treasury split) and burn $MAIN when the vault has enough.
  if (env.TREASURY_SPLIT) {
    const t = env.TREASURY_SPLIT as Address
    const p = await pub.readContract({ address: t, abi: treasuryAbi, functionName: 'pending' })
    if (p >= min) {
      const h = await wallet.writeContract({ address: t, abi: treasuryAbi, functionName: 'distribute' })
      await pub.waitForTransactionReceipt({ hash: h })
      hashes.push(h)
      result.treasuryForwarded = formatEther(p)
    }
  }
  if (env.BUYBACK_VAULT) {
    const v = env.BUYBACK_VAULT as Address
    if (await pub.readContract({ address: v, abi: vaultAbi, functionName: 'ready' })) {
      const h = await wallet.writeContract({ address: v, abi: vaultAbi, functionName: 'buyAndBurn', args: [0n] })
      await pub.waitForTransactionReceipt({ hash: h })
      hashes.push(h)
      result.burned = true
    }
  }
  result.txs = hashes
  await env.MAIN_KV.put('cron:payouts:last', JSON.stringify({ at: new Date().toISOString(), ...result }))
  return result
}

// ------------------------------------------------------------------ leaderboard sync

type Trader = {
  rank: number
  handle: string
  displayName?: string
  avatar?: string | null
  description?: string
  followers?: number
  trades?: number
  holdings?: number
  clan?: { name?: string } | null
  twitter?: string | null
  createdAt?: string | null
  wallets?: { evm?: string | null; solana?: string | null; verified?: boolean }
  pnlUsd?: number
  volumeUsd?: number
}

export async function runSync(env: Env): Promise<Record<string, unknown>> {
  if (!env.FOMOAPI_KEY) return { error: 'FOMOAPI_KEY missing' }
  const windows = ['24h', '7d', '30d', 'all'] as const
  const byHandle = new Map<string, Record<string, unknown> & { pnl: Record<string, number>; rank: Record<string, number>; volume: Record<string, number>; wallets: { evm: string | null; solana: string | null; verified: boolean }; avatar: string | null; followers: number; trades: number }>()
  let credits: string | null = null
  for (const w of windows) {
    const res = await fetch(`https://api.fomoapi.io/v2/leaderboard/${w}?limit=500`, { headers: { authorization: `Bearer ${env.FOMOAPI_KEY}` } })
    if (!res.ok) throw new Error(`fomoapi ${w}: ${res.status}`)
    credits = res.headers.get('x-credits-remaining')
    const data = (await res.json()) as { traders: Trader[] }
    for (const t of data.traders) {
      const key = t.handle.toLowerCase()
      const cur = byHandle.get(key) ?? {
        handle: t.handle,
        name: t.displayName || t.handle,
        avatar: t.avatar || null,
        description: t.description || '',
        followers: t.followers ?? 0,
        trades: t.trades ?? 0,
        holdings: t.holdings ?? 0,
        clan: t.clan?.name || null,
        twitter: t.twitter || null,
        createdAt: t.createdAt || null,
        wallets: { evm: t.wallets?.evm || null, solana: t.wallets?.solana || null, verified: !!t.wallets?.verified },
        pnl: {},
        rank: {},
        volume: {},
      }
      cur.pnl[w] = t.pnlUsd ?? 0
      cur.rank[w] = t.rank
      cur.volume[w] = t.volumeUsd ?? 0
      cur.followers = Math.max(cur.followers, t.followers ?? 0)
      cur.trades = Math.max(cur.trades, t.trades ?? 0)
      if (!cur.avatar && t.avatar) cur.avatar = t.avatar
      if (!cur.wallets.evm && t.wallets?.evm) cur.wallets.evm = t.wallets.evm
      byHandle.set(key, cur)
    }
  }
  const kols = [...byHandle.values()].sort((a, b) => (b.pnl['7d'] ?? 0) - (a.pnl['7d'] ?? 0))
  const payload = { syncedAt: new Date().toISOString(), source: 'fomoapi.io', count: kols.length, kols }
  await env.MAIN_KV.put('kols.json', JSON.stringify(payload))
  const result = { count: kols.length, withEvm: kols.filter((k) => k.wallets.evm).length, credits }
  await env.MAIN_KV.put('cron:sync:last', JSON.stringify({ at: payload.syncedAt, ...result }))
  return result
}

// ------------------------------------------------------------------ entry points

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const job = event.cron.startsWith('7 ') ? runPayouts : runSync
    ctx.waitUntil(job(env).catch(async (e) => {
      await env.MAIN_KV.put(`cron:error:${Date.now()}`, String(e), { expirationTtl: 7 * 86400 })
    }))
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { 'content-type': 'application/json' } })
    if (url.pathname === '/status') {
      const [p, s] = await Promise.all([env.MAIN_KV.get('cron:payouts:last', 'json'), env.MAIN_KV.get('cron:sync:last', 'json')])
      return json({ payouts: p, sync: s })
    }
    if (!env.CRON_KEY || request.headers.get('x-cron-key') !== env.CRON_KEY) return json({ error: 'unauthorized' }, 401)
    try {
      if (url.pathname === '/run/payouts') return json(await runPayouts(env))
      if (url.pathname === '/run/sync') return json(await runSync(env))
    } catch (e) {
      return json({ error: e instanceof Error ? `${e.name}: ${e.message.split('\n')[0]}` : String(e) }, 500)
    }
    return json({ error: 'not found' }, 404)
  },
}
