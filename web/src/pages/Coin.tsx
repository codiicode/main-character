import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Copy, Check, Globe, Star } from 'lucide-react'
import { coins, fmtUsd, fmtPrice } from '../data/mock'
import { useKols, hueFor } from '../data/kols'
import { Avatar, Button, Change, Tag, Verified, Panel, IconButton, Empty } from '../components/ui'

function ChartPlaceholder({ hue, up }: { hue: number; up: boolean }) {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const t = i / 59
    const base = up ? 30 + t * 50 : 80 - t * 40
    const noise = Math.sin(i * 1.7 + hue) * 8 + Math.sin(i * 0.4) * 10
    return [t * 100, 100 - Math.min(95, Math.max(5, base + noise))]
  })
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const color = up ? '#21c95e' : '#ff622e'
  return (
    <div className="well dots relative h-[280px] md:h-[380px] rounded-2xl overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L100,100 L0,100 Z`} fill="url(#g)" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute top-3 left-3 glass rounded-full p-1 flex gap-0.5 text-[13px]">
        {['1m', '5m', '15m', '1h', '1D'].map((t, i) => (
          <span key={t} className={`px-2.5 h-7 grid place-items-center rounded-full font-semibold ${i === 0 ? 'bg-white/15 text-text-primary' : 'text-text-secondary'}`}>{t}</span>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 text-[12px] text-text-tertiary">Live chart connects after launch indexer</div>
    </div>
  )
}

export default function Coin() {
  const { address } = useParams()
  const { kols } = useKols()
  const [copied, setCopied] = useState(false)
  const c = coins.find((x) => x.address.toLowerCase() === address?.toLowerCase())
  if (!c) return <Empty title="Coin not found" body="This address isn't a MAIN coin." action={<Button to="/" variant="glass">Back to leaderboard</Button>} />
  const k = kols.find((x) => x.handle.toLowerCase() === c.kol.toLowerCase())
  const kName = k?.name ?? c.kol
  const kHue = hueFor(c.kol)
  const kolShare = c.endorsed ? 2.0 : 1.0
  const copy = () => { navigator.clipboard?.writeText(c.address); setCopied(true); setTimeout(() => setCopied(false), 1200) }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Back</Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Panel strong className="p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <Avatar name={c.symbol} hue={kHue} src={k?.avatar} large size={64} glow />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[26px] font-bold leading-tight">
                  {c.symbol}
                  {c.endorsed && <Verified className="scale-125" />}
                  <span className="text-text-secondary font-medium text-base truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[14px] text-text-secondary flex-wrap">
                  <span>for</span>
                  <Link to={`/kol/${c.kol}`} className="inline-flex items-center gap-1.5 text-text-primary font-bold hover:underline"><Avatar name={kName} hue={kHue} src={k?.avatar} size={18} /> @{c.kol}</Link>
                  <button onClick={copy} className="inline-flex items-center gap-1 hover:text-text-primary font-mono text-[13px]">{c.address.slice(0, 6)}…{c.address.slice(-4)} {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}</button>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <IconButton label="Website" className="w-9 h-9"><Globe size={16} /></IconButton>
                <IconButton label="Watch" className="w-9 h-9"><Star size={16} /></IconButton>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                ['Market cap', fmtUsd(c.mcap, { compact: true })],
                ['Price', <span dangerouslySetInnerHTML={{ __html: fmtPrice(c.price) }} />],
                ['24h', <Change value={c.change24h} />],
                ['24h volume', fmtUsd(c.vol24h, { compact: true })],
                ['Holders', c.holders.toLocaleString()],
                ['To KOL so far', <span className="text-green">+{(c.feesEth * (kolShare / 3.7)).toFixed(2)} ETH</span>],
              ].map(([l, v], i) => (
                <div key={i} className="well rounded-xl px-3 py-2 min-w-0">
                  <div className="text-[12px] text-text-secondary truncate">{l}</div>
                  <div className="text-[15px] font-bold tabular truncate">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-4"><ChartPlaceholder hue={c.hue} up={c.change24h >= 0} /></div>
          </Panel>

          {/* Fee split */}
          <Panel className="mt-5 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[18px]">Where every trade's fee goes</h3>
              {c.endorsed ? <Tag tone="primary">Endorsed, KOL 2×</Tag> : <Tag tone="muted">Not endorsed yet</Tag>}
            </div>
            <div className="h-3.5 rounded-full overflow-hidden flex well p-[2px] gap-[2px]">
              <div className="rounded-full bg-green" style={{ width: `${(kolShare / (kolShare + 0.5)) * 100}%` }} />
              <div className="rounded-full bg-warning flex-1" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[14px]">
              <div><div className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-green" /> @{c.kol}</div><div className="font-bold tabular text-[20px]">{kolShare === 2 ? '2%' : '1%'}</div><div className="text-text-secondary text-[12px]">of every trade, to their FOMO wallet</div></div>
              <div><div className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-warning" /> Launcher</div><div className="font-bold tabular text-[20px]">0.5%</div><div className="text-text-secondary text-[12px] font-mono">{c.launcher}</div></div>
            </div>
            {!c.endorsed && (
              <div className="mt-4 well rounded-2xl p-3.5 text-[14px] flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1">Are you <b>@{c.kol}</b>? Endorse this coin and your share doubles to 2%.</span>
                <Button size="sm" variant="primary">Endorse with X</Button>
              </div>
            )}
          </Panel>
        </div>

        {/* Trade panel (v1 = deep links; buy panel slot for later) */}
        <aside>
          <Panel strong className="p-4 lg:sticky lg:top-[96px]">
            <div className="well rounded-2xl p-1 grid grid-cols-2 gap-1">
              <button className="h-10 rounded-xl glass-green text-black font-bold">Buy</button>
              <button className="h-10 rounded-xl text-text-secondary font-bold">Sell</button>
            </div>
            <div className="mt-3 well rounded-2xl h-16 flex items-center px-4 text-[28px] text-text-tertiary tabular">$0 <span className="ml-auto text-[13px] text-text-secondary">Enter amount</span></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {['$10', '$100', '$500', '$1000'].map((a) => <button key={a} className="h-9 rounded-xl glass text-[14px] font-bold">{a}</button>)}
            </div>
            <div className="mt-3 grid gap-2">
              <Button variant="green" size="lg" className="w-full" href={`https://fomo.family/tokens/robinhood/${c.address}`}>Buy on FOMO <ExternalLink size={16} /></Button>
              <Button variant="glass" size="md" className="w-full" href={`https://www.ponsfamily.com/launchpad`}>Trade on Pons <ExternalLink size={16} /></Button>
            </div>
            <p className="text-text-secondary text-[12px] mt-3 leading-relaxed">Trading inside MAIN is coming. FOMO already lists every MAIN coin on Robinhood Chain, and fees reach @{c.kol} wherever the trade happens.</p>
          </Panel>

          <Panel className="p-4 mt-4">
            <div className="text-[15px] font-bold mb-2">About {c.symbol}</div>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              {[['Launched', `${c.createdAt} ago`], ['Venue', c.graduated ? 'Uniswap V4' : 'Bonding curve'], ['KOL share', c.endorsed ? '2%' : '1%'], ['Supply', '1B, fixed']].map(([l, v]) => (
                <div key={l} className="well rounded-xl p-2.5"><div className="text-text-secondary text-[12px]">{l}</div>{v}</div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
