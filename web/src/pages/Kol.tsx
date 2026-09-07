import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Rocket, Share, ShieldCheck, Clock, Repeat, Users, ExternalLink } from 'lucide-react'
import { coinsFor, isEndorsed, fmtUsd, fmtCount } from '../data/mock'
import { useKols, hueFor, shortAddr } from '../data/kols'
import { Avatar, Button, Pnl, Change, Stat, Tag, Verified } from '../components/ui'

export default function Kol() {
  const { handle } = useParams()
  const { kols, loading } = useKols()
  const k = kols.find((x) => x.handle.toLowerCase() === handle?.toLowerCase())
  if (loading) return <div className="text-text-secondary">Loading…</div>
  if (!k) return <div className="text-text-secondary">KOL not found.</div>
  const my = coinsFor(k.handle)
  const fees = my.reduce((s, c) => s + c.feesEth, 0)
  const endorsed = isEndorsed(k.handle)
  const hue = hueFor(k.handle)
  const rank24 = k.rank['24h']

  return (
    <div className="max-w-[980px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Leaderboard</Link>

      <div className="card rounded-3xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(600px 200px at 20% 0%, hsl(${hue} 70% 50% / .18), transparent 70%)` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Avatar name={k.name} hue={hue} src={k.avatar} size={64} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[22px] md:text-[26px] font-bold leading-tight"><span className="truncate">{k.name}</span> {endorsed && <Verified className="scale-125" />}</div>
              <div className="text-text-secondary text-[14px] md:text-[15px] truncate">@{k.handle}{k.clan ? ` · ${k.clan}` : ''}{rank24 ? ` · #${rank24} today` : ''}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {k.wallets.evm ? <Tag tone="green"><ShieldCheck size={12} /> Wallet {shortAddr(k.wallets.evm)}</Tag> : <Tag tone="yellow"><Clock size={12} /> Wallet pending</Tag>}
                {endorsed && <Tag tone="primary">Endorsing · 2× fees</Tag>}
              </div>
            </div>
          </div>
          <button className="glass w-10 h-10 rounded-full grid place-items-center text-text-primary shrink-0"><Share size={18} /></button>
        </div>

        {k.description && <p className="relative mt-4 text-[15px] text-text-secondary max-w-2xl">{k.description}</p>}

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Stat label="PnL 24h" value={<Pnl value={k.pnl['24h'] ?? 0} compact />} />
          <Stat label="PnL 7d" value={<Pnl value={k.pnl['7d'] ?? 0} compact />} sub={k.pnl.all != null ? <span className="text-text-secondary">all time <Pnl value={k.pnl.all} compact className="text-[13px]" /></span> : undefined} />
          <Stat label="Fees via MAIN" value={<span className="text-green">+{fees.toFixed(2)} ETH</span>} sub={<span className="text-text-secondary">≈ {fmtUsd(fees * 2501)}</span>} />
          <Stat label="Coins paired" value={my.length} sub={<span className="text-text-secondary">{my.filter((c) => c.endorsed).length} endorsed</span>} />
        </div>

        <div className="relative mt-4 flex flex-wrap gap-4 text-[14px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5"><Users size={14} /> {fmtCount(k.followers)} followers</span>
          <span className="inline-flex items-center gap-1.5"><Repeat size={14} /> {k.trades.toLocaleString()} trades</span>
          {k.wallets.evm && (
            <a href={`https://robinhoodchain.blockscout.com/address/${k.wallets.evm}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-text-primary">
              <ExternalLink size={14} /> Robinhood Chain wallet
            </a>
          )}
        </div>

        <div className="relative mt-5 flex flex-col sm:flex-row gap-2.5">
          <Button variant="primary" size="lg" to={`/launch?kol=${k.handle}`} className="flex-1"><Rocket size={18} /> Launch a coin for {k.name}</Button>
          {!endorsed && (
            <Button variant="glass" size="lg" className="flex-1">Are you {k.name}? Claim & endorse</Button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-[20px] mb-2.5">Coins for @{k.handle}</h2>
        {my.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center text-text-secondary">
            No coin yet. <Link to={`/launch?kol=${k.handle}`} className="text-primary font-bold">Be the first launcher</Link> and earn 0.5% of every trade.
          </div>
        ) : (
          <div className="card rounded-2xl overflow-hidden">
            {my.map((c, i) => (
              <Link key={c.address} to={`/coin/${c.address}`} className={`flex items-center gap-3 px-4 h-[72px] hover:bg-bg-tertiary-solid transition-colors ${i ? 'border-t border-white/5' : ''}`}>
                <Avatar name={c.symbol} hue={c.hue} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-bold"><span>{c.symbol}</span><span className="text-text-secondary font-medium truncate">{c.name}</span>{c.endorsed && <Tag tone="primary">Endorsed</Tag>}</div>
                  <div className="text-text-secondary text-[14px]">{fmtUsd(c.mcap, { compact: true })} MC · {c.holders} holders · {c.createdAt} ago</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular">+{c.feesEth.toFixed(2)} ETH</div>
                  <Change value={c.change24h} className="text-[13px]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
