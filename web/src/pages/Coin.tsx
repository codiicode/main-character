import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Globe, Star } from 'lucide-react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { fmtUsd } from '../data/mock'
import { useKols, hueFor } from '../data/kols'
import { useCoins, fmtEth, ago, getEthUsd } from '../data/coins'
import { Avatar, Button, Tag, Verified, Panel, IconButton, Empty } from '../components/ui'
import { short } from '../components/Connect'
import { explorerAddress, explorerTx, MAIN_LAUNCHER_ADDRESS, robinhoodChain } from '../lib/chain'
import { launcherAbi } from '../lib/launcher'
import { ShareButton } from '../components/ShareCard'
import { useWatchlist, watchKey } from '../data/watchlist'

function Chart({ hue, up }: { hue: number; up: boolean }) {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const t = i / 59
    const base = up ? 30 + t * 50 : 80 - t * 40
    const noise = Math.sin(i * 1.7 + hue) * 8 + Math.sin(i * 0.4) * 10
    return [t * 100, 100 - Math.min(95, Math.max(5, base + noise))]
  })
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const color = up ? '#21c95e' : '#ff622e'
  return (
    <div className="well dots relative h-[240px] md:h-[320px] rounded-2xl overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-60">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L100,100 L0,100 Z`} fill="url(#g)" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute bottom-3 right-3 text-[12px] text-text-tertiary">Price chart arrives with the trade indexer. Open in FOMO for live candles.</div>
    </div>
  )
}

export default function Coin() {
  const { address } = useParams()
  const { kols } = useKols()
  const { coins, loading, refresh } = useCoins()
  const { isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: robinhoodChain.id })
  const [copied, setCopied] = useState(false)
  const [payout, setPayout] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [usd, setUsd] = useState(2500)
  const watch = useWatchlist()
  void getEthUsd().then(setUsd)

  const c = coins.find((x) => x.address.toLowerCase() === address?.toLowerCase())
  if (loading) return <div className="text-text-secondary">Loading</div>
  if (!c) return <Empty title="Coin not found" body="This address isn't a MAIN coin." action={<Button to="/" variant="glass">Back to leaderboard</Button>} />
  const k = c.kind === 'KOL' ? kols.find((x) => x.handle.toLowerCase() === c.kolRef.toLowerCase()) : undefined
  const hue = hueFor(c.kolRef)
  const kolPct = '1%'
  const copy = () => { navigator.clipboard?.writeText(c.address); setCopied(true); setTimeout(() => setCopied(false), 1200) }
  const priceUsd = c.priceEth * usd

  async function distribute() {
    if (!MAIN_LAUNCHER_ADDRESS || !publicClient) return
    try {
      setPayout('busy')
      const hash = await writeContractAsync({ address: MAIN_LAUNCHER_ADDRESS, abi: launcherAbi, functionName: 'sweepAndDistribute', args: [c!.address], chainId: robinhoodChain.id })
      await publicClient.waitForTransactionReceipt({ hash })
      await refresh()
      setPayout('done')
    } catch {
      setPayout('error')
    }
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Back</Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Panel strong className="p-4 md:p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <Avatar name={c.symbol} hue={hue} src={c.logo ?? k?.avatar} large size={64} glow />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[26px] font-bold leading-tight">
                  ${c.symbol}
                  {c.endorsed && <Verified className="scale-125" />}
                  <span className="text-text-secondary font-medium text-base truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-text-secondary flex-wrap">
                  <span>for</span>
                  {c.kind === 'KOL' ? (
                    <Link to={`/kol/${c.kolRef}`} className="inline-flex items-center gap-1.5 text-text-primary font-bold hover:underline"><Avatar name={c.kolRef} hue={hue} src={k?.avatar} size={18} /> @{c.kolRef}</Link>
                  ) : (
                    <span className="text-text-primary font-bold">the {c.kolRef} clan</span>
                  )}
                  <button onClick={copy} className="inline-flex items-center gap-1 hover:text-text-primary font-mono text-[13px]">{short(c.address)} {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}</button>
                  {c.demo && <Tag tone="yellow">Demo</Tag>}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <IconButton label="Explorer" className="w-9 h-9" onClick={() => window.open(explorerAddress(c.address), '_blank')}><Globe size={16} /></IconButton>
                <IconButton label="Watch" className={"w-9 h-9 " + (watch.has(watchKey('coin', c.address)) ? 'text-warning' : '')} onClick={() => watch.toggle(watchKey('coin', c.address))}><Star size={16} fill={watch.has(watchKey('coin', c.address)) ? 'currentColor' : 'none'} /></IconButton>
                <ShareButton size="sm" input={{ title: '$' + c.symbol, subtitle: c.kind === 'KOL' ? `A coin for @${c.kolRef}` : `A coin for the ${c.kolRef} clan`, line: c.kind === 'KOL' ? `${kolPct} of every trade goes to @${c.kolRef}` : `${kolPct} of every trade goes to the clan`, stat: c.toKolEth > 0 ? `+${fmtEth(c.toKolEth)} paid so far` : undefined, avatar: c.logo ?? k?.avatar, hue, url: `${location.origin}/coin/${c.address}`, endorsed: c.endorsed }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                ['Market cap', fmtUsd(c.mcapUsd, { compact: true })],
                ['Price', priceUsd >= 0.001 ? '$' + priceUsd.toFixed(4) : '$' + priceUsd.toExponential(2)],
                ['Volume', fmtEth(c.volumeEth, 2)],
                ['Buyers', c.buyers.toLocaleString()],
                ['Fees so far', fmtEth(c.feesEth, 3)],
                ['To ' + (c.kind === 'KOL' ? '@' + c.kolRef : 'the clan'), <span className="text-green">+{fmtEth(c.toKolEth, 3)}</span>],
              ].map(([l, v], i) => (
                <div key={i} className="well rounded-xl px-3 py-2 min-w-0"><div className="text-[12px] text-text-secondary truncate">{l}</div><div className="text-[15px] font-bold tabular truncate">{v}</div></div>
              ))}
            </div>

            <div className="mt-4"><Chart hue={hue} up={c.volumeEth > 0} /></div>
          </Panel>

          {/* Fee split */}
          <Panel className="mt-5 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[18px]">Where every trade's fee goes</h3>
              {c.endorsed ? <Tag tone="primary">Endorsed by the KOL</Tag> : <Tag tone="muted">Not endorsed yet</Tag>}
            </div>
            <div className="h-3.5 rounded-full overflow-hidden flex well p-[2px] gap-[2px]">
              <div className="rounded-full bg-green" style={{ width: '50%' }} />
              <div className="rounded-full bg-warning" style={{ width: '25%' }} />
              <div className="rounded-full bg-dev flex-1" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[14px]">
              <div><div className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-green" /> {c.kind === 'KOL' ? '@' + c.kolRef : c.kolRef + ' clan'}</div><div className="font-bold tabular text-[20px]">{kolPct}</div><div className="text-text-secondary text-[12px]">{c.kind === 'KOL' ? 'of every trade, to their FOMO wallet' : `of every trade, split across ${c.kolAccounts.length} members`}</div></div>
              <div><div className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-warning" /> Launcher</div><div className="font-bold tabular text-[20px]">0.5%</div><div className="text-text-secondary text-[12px] font-mono">{c.launcher ? short(c.launcher) : 'demo'}</div></div>
              <div><div className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-dev" /> $MAIN burn</div><div className="font-bold tabular text-[20px]">0.5%</div><div className="text-text-secondary text-[12px]">buys and burns $MAIN</div></div>
            </div>
            {!c.endorsed && c.kind === 'KOL' && (
              <div className="mt-4 well rounded-2xl p-3.5 text-[14px] flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1">Are you <b>@{c.kolRef}</b>? Endorse this coin to get the verified badge and show it's really you.</span>
                <Button size="sm" variant="primary" to={`/endorse/${c.address}`}>Endorse with X</Button>
              </div>
            )}
            {!c.demo && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
                <span>Payouts are automatic. Anyone can trigger one.</span>
                {isConnected && <Button size="sm" variant="glass" onClick={distribute} disabled={payout === 'busy'}>{payout === 'busy' ? 'Paying out' : payout === 'done' ? 'Paid out' : 'Pay out now'}</Button>}
                {payout === 'error' && <span className="text-red">Nothing to pay out yet, or the transaction failed.</span>}
              </div>
            )}
          </Panel>
        </div>

        <aside>
          <Panel strong className="p-4 lg:sticky lg:top-[96px]">
            <div className="well rounded-2xl p-1 grid grid-cols-2 gap-1">
              <button className="h-10 rounded-xl glass-green text-black font-bold">Buy</button>
              <button className="h-10 rounded-xl text-text-secondary font-bold">Sell</button>
            </div>
            <div className="mt-3 well rounded-2xl h-16 flex items-center px-4 text-[28px] text-text-tertiary tabular">$0 <span className="ml-auto text-[13px] text-text-secondary">Enter amount</span></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">{['$10', '$100', '$500', '$1000'].map((a) => <button key={a} className="h-9 rounded-xl glass text-[14px] font-bold">{a}</button>)}</div>
            <div className="mt-3 grid gap-2">
              <Button variant="green" size="lg" className="w-full" href={`https://fomo.family/tokens/robinhood/${c.address}`}>Buy on FOMO</Button>
              <Button variant="glass" size="md" className="w-full" href={`https://www.ponsfamily.com/token/${c.address}`}>Trade on Pons</Button>
            </div>
            <p className="text-text-secondary text-[12px] mt-3 leading-relaxed">Trading inside MAIN is coming. FOMO lists every MAIN coin on Robinhood Chain, and fees reach {c.kind === 'KOL' ? '@' + c.kolRef : 'the clan'} wherever the trade happens.</p>
          </Panel>

          <Panel className="p-4 mt-4">
            <div className="text-[15px] font-bold mb-2">About ${c.symbol}</div>
            {c.description && <p className="text-[14px] text-text-secondary mb-3">{c.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              {[
                ['Launched', c.launchedAt ? `${ago(c.launchedAt)} ago` : 'demo'],
                ['Venue', c.graduated ? 'Uniswap V4' : 'Bonding curve'],
                ['KOL share', kolPct],
                ['Supply', '1B, fixed'],
              ].map(([l, v]) => <div key={l} className="well rounded-xl p-2.5"><div className="text-text-secondary text-[12px]">{l}</div>{v}</div>)}
            </div>
            {!c.demo && (
              <div className="mt-3 grid gap-1 text-[12px] text-text-secondary">
                {c.splitter && <a className="hover:text-text-primary underline underline-offset-4 decoration-white/20" href={explorerAddress(c.splitter)} target="_blank" rel="noreferrer">Fee splitter on Blockscout</a>}
                {c.txHash && <a className="hover:text-text-primary underline underline-offset-4 decoration-white/20" href={explorerTx(c.txHash)} target="_blank" rel="noreferrer">Launch transaction</a>}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  )
}
