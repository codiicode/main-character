// POST /api/endorse { token } → verifies the logged-in X user is the coin's KOL, then MainLauncher.setEndorsed(token, true).
//
// Identity rule: the X username must equal the FOMO handle the coin was launched for, or the FOMO profile
// must list that X account in its `twitter` field. Clans cannot be endorsed in v1.
import { createPublicClient, createWalletClient, http, parseAbi, defineChain, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { readSession } from '../_lib/session'
import { jsonResponse, normalizeHandle, resolveHandle } from '../_lib/fomo'

type Env = { SESSION_SECRET?: string; SIGNER_PK?: string; MAIN_LAUNCHER?: string; RPC_URL?: string; MAIN_START_BLOCK?: string; FOMOAPI_KEY?: string }

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
})

const abi = parseAbi([
  'event CoinLaunched(address indexed token, address indexed curve, address indexed splitter, address launcher, uint8 kind, string kolRef, address[] kolAccounts, uint256 devBuyWei)',
  'function setEndorsed(address token, bool endorsed)',
  'function splitterOf(address token) view returns (address)',
])
const splitterAbi = parseAbi(['function endorsed() view returns (bool)'])

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SESSION_SECRET || !env.SIGNER_PK || !env.MAIN_LAUNCHER) return jsonResponse({ error: 'Endorsements are not configured yet.' }, 503)
  const session = await readSession(env.SESSION_SECRET, request.headers.get('cookie'))
  if (!session) return jsonResponse({ error: 'Log in with X first.' }, 401)

  const body = (await request.json().catch(() => ({}))) as { token?: string }
  const token = body.token?.toLowerCase()
  if (!token || !/^0x[0-9a-f]{40}$/.test(token)) return jsonResponse({ error: 'Bad token address.' }, 400)

  const rpc = env.RPC_URL || chain.rpcUrls.default.http[0]
  const pub = createPublicClient({ chain, transport: http(rpc) })
  const launcher = env.MAIN_LAUNCHER as Address

  const splitter = await pub.readContract({ address: launcher, abi, functionName: 'splitterOf', args: [token as Address] })
  if (!splitter || /^0x0+$/.test(splitter)) return jsonResponse({ error: 'Not a MAIN coin.' }, 404)
  if (await pub.readContract({ address: splitter, abi: splitterAbi, functionName: 'endorsed' })) return jsonResponse({ ok: true, already: true })

  const fromBlock = BigInt(env.MAIN_START_BLOCK || '0')
  const logs = await pub.getContractEvents({ address: launcher, abi, eventName: 'CoinLaunched', args: { token: token as Address }, fromBlock, toBlock: 'latest' })
  const ev = logs[0]?.args as { kind?: number; kolRef?: string } | undefined
  if (!ev?.kolRef) return jsonResponse({ error: 'Could not find the launch record for this coin.' }, 404)
  if (ev.kind === 1) return jsonResponse({ error: 'Clan coins cannot be endorsed yet.' }, 400)

  // Identity check
  const handle = normalizeHandle(ev.kolRef)
  const x = session.x.toLowerCase()
  let match = !!handle && handle.toLowerCase() === x
  if (!match && handle && env.FOMOAPI_KEY) {
    try {
      const { kol } = await resolveHandle(handle, env.FOMOAPI_KEY)
      const linked = kol?.twitter?.replace(/^.*\//, '').replace(/^@/, '').toLowerCase()
      match = !!linked && linked === x
    } catch {
      /* fall through */
    }
  }
  if (!match) return jsonResponse({ error: `This coin is for @${ev.kolRef} on FOMO, but you're @${session.x} on X. Add your X handle to your FOMO profile or log in with the matching account.` }, 403)

  const account = privateKeyToAccount(env.SIGNER_PK as `0x${string}`)
  const wallet = createWalletClient({ account, chain, transport: http(rpc) })
  const hash = await wallet.writeContract({ address: launcher, abi, functionName: 'setEndorsed', args: [token as Address, true] })
  await pub.waitForTransactionReceipt({ hash })
  return jsonResponse({ ok: true, hash })
}
