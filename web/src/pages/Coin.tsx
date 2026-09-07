import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Copy, Globe, Star } from 'lucide-react'
import { coins, kols, fmtUsd, fmtPrice } from '../data/mock'
import { Avatar, Button, Change, Tag, Verified } from '../components/ui'

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
    <div className="relative h-[280px] md:h-[380px] rounded-2xl overflow-hidden bg-bg-primary/60" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L100,100 L0,100 Z`} fill="url(#g)" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute top-3 left-3 flex gap-1 text-[13px]">
        {['1m', '5m', '15m', '1h', '1D'].map((t, i) => (
          <span key={t} className={`px-2 h-7 grid place-items-center rounded-lg ${i === 0 ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'}`}>{t}</span>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 text-[12px] text-text-tertiary">Chart via Pons · placeholder</div>
    </div>
  )
}

export default function Coin() {
  const { address } = useParams()
  const c = coins.find((x) => x.address.toLowerCase() === address?.toLowerCase())
  if (!c) return <div className="text-text-secondary">Coin not found.</div>
  const k = kols.find((x) => x.handle === c.kol)!
  const kolShare = c.endorsed ? 2.0 : 1.0
  const mainShare = c.endorsed ? 1.2 : 2.2

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Back</Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Avatar name={c.symbol} hue={c.hue} size={52} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[24px] font-bold leading-tight">
                {c.symbol}
                {c.endorsed && <Verified className="scale-125" />}
                <span className="text-text-secondary font-medium text-base truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[14px] text-text-secondary">
                <span>for</span>
                <Link to={`/kol/${k.handle}`} className="inline-flex items-center gap-1 text-text-primary font-bold hover:underline"><Avatar name={k.name} hue={k.hue} size={16} /> @{k.handle}</Link>
                <span>·</span>
                <button className="inline-flex items-center gap-1 hover:text-text-primary font-mono">{c.address.slice(0, 6)}…{c.address.slice(-4)} <Copy size={12} /></button>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button className="glass w-9 h-9 rounded-full grid place-items-center"><Globe size={16} /></button>
              <button className="glass w-9 h-9 rounded-full grid place-items-center"><Star size={16} /></button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              ['Market cap', fmtUsd(c.mcap, { compact: true })],
              ['Price', <span dangerouslySetInnerHTML={{ __html: fmtPrice(c.price) }} />],
              ['24h', <Change value={c.change24h} />],
              ['24h vol', fmtUsd(c.vol24h, { compact: true })],
              ['Holders', c.holders.toLocaleString()],
              ['Fees to KOL', <span className="text-green">+{(c.feesEth * (kolShare / 3.7)).toFixed(2)} ETH</span>],
            ].map(([l, v], i) => (
              <div key={i} className="card rounded-xl px-3 py-2">
                <div className="text-[12px] text-text-secondary">{l}</div>
                <div className="text-[15px] font-bold tabular truncate">{v}</div>
              </div>
            ))}
          </div>

          <div className="mt-4"><ChartPlaceholder hue={c.hue} up={c.change24h >= 0} /></div>

          {/* Fee split */}
          <div className="mt-5 card rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[18px]">Where the fees go</h3>
              {c.endorsed ? <Tag tone="primary">Endorsed · KOL 2×</Tag> : <Tag tone="muted">Not endorsed yet</Tag>}
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-bg-tertiary">
              <div className="bg-green" style={{ width: `${(kolShare / 3.7) * 100}%` }} />
              <div className="bg-warning" style={{ width: `${(0.5 / 3.7) * 100}%` }} />
              <div className="bg-primary" style={{ width: `${(mainShare / 3.7) * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[14px]">
              <div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green" /> KOL @{k.handle}</div><div className="font-bold tabular text-[17px]">{kolShare.toFixed(1)}%</div><div className="text-text-secondary text-[12px]">of every trade</div></div>
              <div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Launcher</div><div className="font-bold tabular text-[17px]">0.5%</div><div className="text-text-secondary text-[12px]">{c.launcher}</div></div>
              <div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> MAIN</div><div className="font-bold tabular text-[17px]">{mainShare.toFixed(1)}%</div><div className="text-text-secondary text-[12px]">platform</div></div>
            </div>
            {!c.endorsed && (
              <div className="mt-4 p-3 rounded-xl bg-primary-transparent text-[14px] flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="flex-1">Are you <b>@{k.handle}</b>? Endorse this coin and your share doubles to 2.0%, paid to your FOMO wallet.</span>
                <Button size="sm" variant="primary">Endorse with X</Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: trade panel (v1 = deep links; buy panel slot for later) */}
        <aside>
          <div className="card rounded-2xl p-4 lg:sticky lg:top-[88px]">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-bg-primary/60">
              <button className="h-10 rounded-lg bg-green text-black font-bold">Buy</button>
              <button className="h-10 rounded-lg text-text-secondary font-bold">Sell</button>
            </div>
            <div className="mt-3 h-16 rounded-xl bg-bg-primary/60 border border-white/5 flex items-center px-4 text-[26px] text-text-tertiary tabular">$0 <span className="ml-auto text-[14px] text-text-secondary">Enter amount</span></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {['$10', '$100', '$500', '$1000'].map((a) => <button key={a} className="h-9 rounded-lg bg-bg-tertiary text-[14px] font-bold">{a}</button>)}
            </div>
            <div className="mt-3 grid gap-2">
              <Button variant="green" size="lg" className="w-full">Buy on FOMO <ExternalLink size={16} /></Button>
              <Button variant="glass" size="md" className="w-full">Trade on Pons <ExternalLink size={16} /></Button>
            </div>
            <p className="text-text-secondary text-[12px] mt-3 leading-relaxed">In-app trading is coming. Until then, FOMO lists every MAIN coin automatically on Robinhood Chain. Fees flow to @{k.handle} wherever the trade happens.</p>
          </div>

          <div className="card rounded-2xl p-4 mt-4">
            <div className="text-[15px] font-bold mb-2">About {c.symbol}</div>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              <div className="rounded-xl bg-bg-primary/60 p-2.5"><div className="text-text-secondary text-[12px]">Launched</div>{c.createdAt} ago</div>
              <div className="rounded-xl bg-bg-primary/60 p-2.5"><div className="text-text-secondary text-[12px]">Status</div>{c.graduated ? 'Uniswap V4' : 'Bonding curve'}</div>
              <div className="rounded-xl bg-bg-primary/60 p-2.5"><div className="text-text-secondary text-[12px]">Creator tax</div>3%</div>
              <div className="rounded-xl bg-bg-primary/60 p-2.5"><div className="text-text-secondary text-[12px]">Supply</div>1B fixed</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
