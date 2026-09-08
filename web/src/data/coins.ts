import { useEffect, useState } from 'react'
import { createPublicClient, http, fallback, formatEther, parseAbi, type Abi, type Address } from 'viem'
import { robinhoodChain, MAIN_LAUNCHER_ADDRESS, MAIN_START_BLOCK, PONS_FACTORY_ADDRESS, HIDDEN_COINS, RPC_FALLBACKS } from '../lib/chain'
import { launcherAbi, splitterAbi } from '../lib/launcher'
import { coins as mockCoins } from './mock'

export type CoinView = {
  address: Address
  curve: Address | null
  splitter: Address | null
  name: string
  symbol: string
  logo: string | null
  description: string
  kind: 'KOL' | 'CLAN'
  kolRef: string // FOMO handle or clan name
  launcher: Address | null
  kolAccounts: Address[]
  endorsed: boolean
  graduated: boolean
  priceEth: number
  mcapUsd: number
  volumeEth: number
  buyers: number
  feesEth: number // total that reached the splitter (distributed + waiting)
  toKolEth: number
  launchedAt: number | null // unix seconds
  txHash: string | null
  demo: boolean
}

export type Activity =
  | { type: 'launch'; at: number; block: bigint; token: Address; symbol: string; kolRef: string; kind: 'KOL' | 'CLAN'; launcher: Address }
  | { type: 'endorse'; at: number; block: bigint; token: Address; symbol: string; kolRef: string }
  | { type: 'payout'; at: number; block: bigint; token: Address; symbol: string; kolRef: string; eth: number }

const SUPPLY = 1e9
const curveAbi = parseAbi([
  'function getReserves() view returns (uint256 quoteReserve_, uint256 tokenReserve_)',
  'function graduated() view returns (bool)',
  'event CurveBuy(address indexed buyer, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 tax)',
  'event CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)',
])
const tokenAbi = parseAbi(['function logo() view returns (string)', 'function description() view returns (string)'])
const ponsAbi = parseAbi([
  'function getLaunchedToken(address token) view returns ((address token,address curve,address deployer,address creatorFeeRecipient,address pairToken,uint256 graduationThreshold,uint24 poolFee,int24 tickSpacing,uint16 creatorTaxBps,bool buybackEnabled,uint8 phase,uint256 sweptQuote,uint256 sweptTokens,uint256 sweptAt,bool exists))',
])

export const client = createPublicClient({ chain: robinhoodChain, transport: fallback(RPC_FALLBACKS.map((u) => http(u))) })

let ethUsd = 2500
let ethUsdAt = 0
export async function getEthUsd(): Promise<number> {
  if (Date.now() - ethUsdAt < 5 * 60_000) return ethUsd
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot')
    const j = (await r.json()) as { data?: { amount?: string } }
    const n = Number(j.data?.amount)
    if (isFinite(n) && n > 0) ethUsd = n
  } catch {
    /* keep last value */
  }
  ethUsdAt = Date.now()
  return ethUsd
}

// ------------------------------------------------------------------ mock fallback (no contract yet)

function fromMock(): CoinView[] {
  return mockCoins.map((c) => ({
    address: c.address as Address,
    curve: null,
    splitter: null,
    name: c.name,
    symbol: c.symbol,
    logo: null,
    description: '',
    kind: 'KOL',
    kolRef: c.kol,
    launcher: null,
    kolAccounts: [],
    endorsed: c.endorsed,
    graduated: c.graduated,
    priceEth: c.price / 2500,
    mcapUsd: c.mcap,
    volumeEth: c.vol24h / 2500,
    buyers: c.holders,
    feesEth: c.feesEth,
    toKolEth: c.feesEth * ((c.endorsed ? 2 : 1) / 3.7),
    launchedAt: null,
    txHash: null,
    demo: true,
  }))
}

// ------------------------------------------------------------------ on-chain

type Snapshot = { coins: CoinView[]; activity: Activity[]; at: number }
let snap: Snapshot | null = null
let inflight: Promise<Snapshot> | null = null
const listeners = new Set<() => void>()

async function loadChain(): Promise<Snapshot> {
  const launcher = MAIN_LAUNCHER_ADDRESS!
  const [usd, latest] = await Promise.all([getEthUsd(), client.getBlockNumber()])
  const fromBlock = MAIN_START_BLOCK > 0n ? MAIN_START_BLOCK : latest - 200_000n > 0n ? latest - 200_000n : 0n

  const [launched, endorsedLogs, sweptLogs] = await Promise.all([
    client.getContractEvents({ address: launcher, abi: launcherAbi as Abi, eventName: 'CoinLaunched', fromBlock, toBlock: latest }),
    client.getContractEvents({ address: launcher, abi: launcherAbi as Abi, eventName: 'Endorsed', fromBlock, toBlock: latest }),
    client.getContractEvents({ address: launcher, abi: launcherAbi as Abi, eventName: 'Swept', fromBlock, toBlock: latest }),
  ])

  const blockCache = new Map<bigint, number>()
  const ts = async (b: bigint) => {
    if (!blockCache.has(b)) blockCache.set(b, Number((await client.getBlock({ blockNumber: b })).timestamp))
    return blockCache.get(b)!
  }

  const coins: CoinView[] = await Promise.all(
    launched.map(async (ev) => {
      const a = ev.args as { token: Address; curve: Address; splitter: Address; launcher: Address; kind: number; kolRef: string; kolAccounts: Address[] }
      const [name, symbol, logo, description, reserves, launchedTok, endorsed, totalDistributed, totalToKol, claimable, buys, sells, at] = await Promise.all([
        client.readContract({ address: a.token, abi: parseAbi(['function name() view returns (string)']), functionName: 'name' }),
        client.readContract({ address: a.token, abi: parseAbi(['function symbol() view returns (string)']), functionName: 'symbol' }),
        client.readContract({ address: a.token, abi: tokenAbi, functionName: 'logo' }).catch(() => ''),
        client.readContract({ address: a.token, abi: tokenAbi, functionName: 'description' }).catch(() => ''),
        client.readContract({ address: a.curve, abi: curveAbi, functionName: 'getReserves' }).catch(() => [0n, 0n] as const),
        client.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsAbi, functionName: 'getLaunchedToken', args: [a.token] }),
        client.readContract({ address: a.splitter, abi: splitterAbi as Abi, functionName: 'endorsed' }) as Promise<boolean>,
        client.readContract({ address: a.splitter, abi: splitterAbi as Abi, functionName: 'totalDistributed' }) as Promise<bigint>,
        client.readContract({ address: a.splitter, abi: splitterAbi as Abi, functionName: 'totalToKol' }) as Promise<bigint>,
        client.readContract({ address: a.splitter, abi: splitterAbi as Abi, functionName: 'claimable' }) as Promise<bigint>,
        client.getContractEvents({ address: a.curve, abi: curveAbi, eventName: 'CurveBuy', fromBlock: ev.blockNumber, toBlock: latest }).catch(() => []),
        client.getContractEvents({ address: a.curve, abi: curveAbi, eventName: 'CurveSell', fromBlock: ev.blockNumber, toBlock: latest }).catch(() => []),
        ts(ev.blockNumber),
      ])
      const [q, t] = reserves as readonly [bigint, bigint]
      const priceEth = t > 0n ? Number(formatEther(q)) / (Number(t) / 1e18) : 0
      const volumeEth =
        buys.reduce((s, b) => s + Number(formatEther((b.args as { quoteIn: bigint }).quoteIn)), 0) +
        sells.reduce((s, b) => s + Number(formatEther((b.args as { quoteOut: bigint }).quoteOut)), 0)
      const buyers = new Set(buys.map((b) => (b.args as { recipient: Address }).recipient.toLowerCase())).size
      const graduated = Number((launchedTok as { phase: number }).phase) >= 2
      return {
        address: a.token,
        curve: a.curve,
        splitter: a.splitter,
        name: name as string,
        symbol: symbol as string,
        logo: (logo as string) || null,
        description: description as string,
        kind: a.kind === 1 ? 'CLAN' : 'KOL',
        kolRef: a.kolRef,
        launcher: a.launcher,
        kolAccounts: a.kolAccounts,
        endorsed,
        graduated,
        priceEth,
        mcapUsd: priceEth * SUPPLY * usd,
        volumeEth,
        buyers,
        feesEth: Number(formatEther(totalDistributed + claimable)),
        toKolEth: Number(formatEther(totalToKol)),
        launchedAt: at,
        txHash: ev.transactionHash,
        demo: false,
      } satisfies CoinView
    }),
  )
  coins.sort((a, b) => (b.launchedAt ?? 0) - (a.launchedAt ?? 0))

  const byToken = new Map(coins.map((c) => [c.address.toLowerCase(), c]))
  const activity: Activity[] = []
  for (const ev of launched) {
    const c = byToken.get((ev.args as { token: Address }).token.toLowerCase())!
    activity.push({ type: 'launch', at: c.launchedAt ?? 0, block: ev.blockNumber, token: c.address, symbol: c.symbol, kolRef: c.kolRef, kind: c.kind, launcher: c.launcher! })
  }
  for (const ev of endorsedLogs) {
    const a = ev.args as { token: Address; endorsed: boolean }
    const c = byToken.get(a.token.toLowerCase())
    if (c && a.endorsed) activity.push({ type: 'endorse', at: await ts(ev.blockNumber), block: ev.blockNumber, token: c.address, symbol: c.symbol, kolRef: c.kolRef })
  }
  for (const ev of sweptLogs) {
    const a = ev.args as { token: Address; distributed: bigint }
    const c = byToken.get(a.token.toLowerCase())
    if (c) activity.push({ type: 'payout', at: await ts(ev.blockNumber), block: ev.blockNumber, token: c.address, symbol: c.symbol, kolRef: c.kolRef, eth: Number(formatEther(a.distributed)) })
  }
  activity.sort((a, b) => b.at - a.at || Number(b.block - a.block))

  const visible = coins.filter((c) => !HIDDEN_COINS.has(c.address.toLowerCase()))
  const visibleActivity = activity.filter((a) => !HIDDEN_COINS.has(a.token.toLowerCase()))
  return { coins: visible, activity: visibleActivity, at: Date.now() }
}

export function loadCoins(force = false): Promise<Snapshot> {
  if (!MAIN_LAUNCHER_ADDRESS) return Promise.resolve({ coins: fromMock(), activity: [], at: Date.now() })
  if (snap && !force && Date.now() - snap.at < 30_000) return Promise.resolve(snap)
  if (!inflight) {
    inflight = loadChain()
      .then((s) => {
        snap = s
        listeners.forEach((l) => l())
        return s
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useCoins(opts: { refreshMs?: number } = {}) {
  const [state, setState] = useState<Snapshot | null>(snap)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const tick = () => loadCoins().then((s) => alive && setState(s)).catch((e) => alive && setError(String(e)))
    tick()
    const l = () => snap && setState(snap)
    listeners.add(l)
    const id = opts.refreshMs ? setInterval(() => loadCoins(true).catch(() => {}), opts.refreshMs) : undefined
    return () => {
      alive = false
      listeners.delete(l)
      if (id) clearInterval(id)
    }
  }, [opts.refreshMs])
  return { coins: state?.coins ?? [], activity: state?.activity ?? [], loading: !state && !error, error, demo: !MAIN_LAUNCHER_ADDRESS, refresh: () => loadCoins(true) }
}

export const coinsFor = (coins: CoinView[], ref: string) => coins.filter((c) => c.kolRef.toLowerCase() === ref.toLowerCase())
export const isEndorsedRef = (coins: CoinView[], ref: string) => coinsFor(coins, ref).some((c) => c.endorsed)
export const fmtEth = (n: number, d = 3) => (n >= 1000 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(d)) + ' ETH'
export const ago = (unix: number | null) => {
  if (!unix) return ''
  const s = Math.max(1, Math.floor(Date.now() / 1000 - unix))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
