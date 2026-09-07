/// <reference types="@cloudflare/workers-types" />
// POST /api/free-launch
// Launches a coin from MAIN's relayer wallet for someone who has no wallet. MAIN pays the Pons fee + gas.
// Guards: Cloudflare Turnstile, per-IP / per-KOL / global daily caps in KV, relayer balance floor.
import { createPublicClient, createWalletClient, http, defineChain, decodeEventLog, parseAbi, formatEther, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { jsonResponse, normalizeHandle, resolveHandle, type Kol } from '../_lib/fomo'

type Env = {
  RELAYER_PK?: string
  SIGNER_PK?: string
  MAIN_LAUNCHER?: string
  RPC_URL?: string
  FOMOAPI_KEY?: string
  TURNSTILE_SECRET?: string
  MAIN_KV?: KVNamespace
  FREE_LAUNCHES_PER_DAY?: string
  FREE_LAUNCHES_PER_IP?: string
  RELAYER_MIN_ETH?: string
}

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
})

const PONS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as const
const ZERO = '0x0000000000000000000000000000000000000000' as const

const ponsAbi = parseAbi([
  'function launchFee() view returns (uint256)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
])
const launcherAbi = parseAbi([
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct LaunchInput { string name; string symbol; string logo; string description; Socials socials; bytes32 expectedEconomics; bytes32 salt; uint8 kind; string kolRef; address[] kolAccounts; uint96[] kolWeights; uint256 minTokensOut; }',
  'function launchFor(LaunchInput input, address launcher) payable returns (address token, address curve, address splitter)',
  'function treasury() view returns (address)',
  'event CoinLaunched(address indexed token, address indexed curve, address indexed splitter, address launcher, uint8 kind, string kolRef, address[] kolAccounts, uint256 devBuyWei, bool relayed)',
])

type Body = {
  mode?: 'KOL' | 'CLAN'
  handle?: string
  clan?: string
  name?: string
  symbol?: string
  description?: string
  logo?: string
  twitter?: string
  website?: string
  payout?: string
  turnstile?: string
}

const day = () => new Date().toISOString().slice(0, 10)

async function bump(kv: KVNamespace | undefined, key: string, limit: number): Promise<boolean> {
  if (!kv) return true
  const k = `rl:${key}:${day()}`
  const n = Number((await kv.get(k)) ?? '0')
  if (n >= limit) return false
  await kv.put(k, String(n + 1), { expirationTtl: 2 * 86400 })
  return true
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const pk = env.RELAYER_PK || env.SIGNER_PK
  if (!pk || !env.MAIN_LAUNCHER || !env.FOMOAPI_KEY) return jsonResponse({ error: 'Free launches are not configured yet.' }, 503)

  const b = (await request.json().catch(() => ({}))) as Body
  const name = (b.name ?? '').trim()
  const symbol = (b.symbol ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (name.length < 2 || name.length > 32) return jsonResponse({ error: 'Name must be 2 to 32 characters.' }, 400)
  if (symbol.length < 2 || symbol.length > 10) return jsonResponse({ error: 'Ticker must be 2 to 10 letters or digits.' }, 400)
  const payout = (b.payout ?? '').trim()
  if (payout && !/^0x[0-9a-fA-F]{40}$/.test(payout)) return jsonResponse({ error: 'Payout address must be a 0x address on Robinhood Chain.' }, 400)
  const mode = b.mode === 'CLAN' ? 'CLAN' : 'KOL'

  // 1. human check
  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get('cf-connecting-ip') ?? ''
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: b.turnstile ?? '', remoteip: ip })
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    const j = (await v.json().catch(() => ({}))) as { success?: boolean }
    if (!j.success) return jsonResponse({ error: 'Human check failed. Reload and try again.' }, 403)
  }

  // 2. caps
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const perDay = Number(env.FREE_LAUNCHES_PER_DAY ?? '25')
  const perIp = Number(env.FREE_LAUNCHES_PER_IP ?? '2')
  if (!(await bump(env.MAIN_KV, 'free:global', perDay))) return jsonResponse({ error: "Today's free launches are used up. Connect a wallet to launch now, or come back tomorrow." }, 429)
  if (!(await bump(env.MAIN_KV, `free:ip:${ip}`, perIp))) return jsonResponse({ error: 'You have used your free launches for today. Connect a wallet to launch more.' }, 429)

  // 3. target
  let kolRef: string
  let kolAccounts: Address[]
  let logo = (b.logo ?? '').trim()
  let kolForDesc = ''
  if (mode === 'KOL') {
    const handle = normalizeHandle(b.handle)
    if (!handle) return jsonResponse({ error: 'Pick a FOMO trader.' }, 400)
    if (!(await bump(env.MAIN_KV, `free:kol:${handle.toLowerCase()}`, 1))) return jsonResponse({ error: `@${handle} already got a free coin today. Connect a wallet to launch another.` }, 429)
    let kol: Kol | null = null
    const cached = env.MAIN_KV ? await env.MAIN_KV.get<{ kol: Kol | null }>(`kol:${handle.toLowerCase()}`, 'json') : null
    if (cached?.kol?.wallets.evm) kol = cached.kol
    else {
      const r = await resolveHandle(handle, env.FOMOAPI_KEY)
      kol = r.kol
      if (env.MAIN_KV && kol) await env.MAIN_KV.put(`kol:${handle.toLowerCase()}`, JSON.stringify({ kol }), { expirationTtl: kol.wallets.evm ? 30 * 86400 : 3600 })
    }
    if (!kol) return jsonResponse({ error: `No FOMO trader called @${handle}.` }, 404)
    kolRef = kol.handle
    kolAccounts = [(kol.wallets.evm as Address) || ZERO]
    kolForDesc = `@${kol.handle}`
    if (!logo && kol.avatar) logo = kol.avatar.replace('_small.', '.')
  } else {
    const clanName = (b.clan ?? '').trim()
    if (!clanName) return jsonResponse({ error: 'Pick a clan.' }, 400)
    if (!(await bump(env.MAIN_KV, `free:clan:${clanName.toLowerCase()}`, 1))) return jsonResponse({ error: `The ${clanName} clan already got a free coin today.` }, 429)
    // members come from the same snapshot the site uses
    const snap = (await (await fetch(new URL('/data/kols.json', request.url).toString())).json()) as { kols: Kol[] }
    const members = snap.kols.filter((k) => k.clan?.toLowerCase() === clanName.toLowerCase() && k.wallets.evm)
    if (members.length === 0) return jsonResponse({ error: 'No member of that clan has a wallet yet.' }, 400)
    kolRef = members[0].clan!
    kolAccounts = members.map((m) => m.wallets.evm as Address)
    kolForDesc = `the ${kolRef} clan`
    if (!logo && members[0].avatar) logo = members[0].avatar.replace('_small.', '.')
  }

  // 4. relayer + chain
  const rpc = env.RPC_URL || chain.rpcUrls.default.http[0]
  const pub = createPublicClient({ chain, transport: http(rpc) })
  const account = privateKeyToAccount(pk as Hex)
  const wallet = createWalletClient({ account, chain, transport: http(rpc) })
  const launcherAddr = env.MAIN_LAUNCHER as Address

  const [fee, econ, bal, treasury] = await Promise.all([
    pub.readContract({ address: PONS, abi: ponsAbi, functionName: 'launchFee' }),
    pub.readContract({ address: PONS, abi: ponsAbi, functionName: 'previewLaunchEconomics', args: [0n, ZERO] }),
    pub.getBalance({ address: account.address }),
    pub.readContract({ address: launcherAddr, abi: launcherAbi, functionName: 'treasury' }),
  ])
  const minEth = Number(env.RELAYER_MIN_ETH ?? '0.005')
  if (Number(formatEther(bal)) < minEth) return jsonResponse({ error: 'Free launches are paused while MAIN tops up its wallet. Connect a wallet to launch now.' }, 503)

  const salt = ('0x' + [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, '0')).join('')) as Hex
  const input = {
    name,
    symbol,
    logo,
    description: (b.description ?? '').trim() || `A coin for ${kolForDesc} on MAIN. 1% of every trade goes to them.`,
    socials: { twitter: (b.twitter ?? '').trim(), telegram: '', discord: '', website: (b.website ?? '').trim(), farcaster: '' },
    expectedEconomics: econ,
    salt,
    kind: mode === 'KOL' ? 0 : 1,
    kolRef,
    kolAccounts,
    kolWeights: kolAccounts.map(() => 1n),
    minTokensOut: 0n,
  }
  const launcher = (payout || treasury) as Address

  try {
    const hash = await wallet.writeContract({ address: launcherAddr, abi: launcherAbi, functionName: 'launchFor', args: [input, launcher], value: fee })
    const receipt = await pub.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') return jsonResponse({ error: 'The launch transaction reverted.' }, 502)
    let token: Address | null = null
    for (const l of receipt.logs) {
      if (l.address.toLowerCase() !== launcherAddr.toLowerCase()) continue
      try {
        const ev = decodeEventLog({ abi: launcherAbi, data: l.data, topics: l.topics })
        if (ev.eventName === 'CoinLaunched') token = (ev.args as { token: Address }).token
      } catch {
        /* other event */
      }
    }
    return jsonResponse({ ok: true, hash, token })
  } catch (e) {
    const msg = e instanceof Error ? e.message.split('\n')[0] : String(e)
    return jsonResponse({ error: `Launch failed: ${msg}` }, 502)
  }
}
