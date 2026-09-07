import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Rocket, Share, ShieldCheck, Clock, Repeat, Users, ExternalLink } from 'lucide-react'
import { coinsFor, isEndorsed, fmtUsd, fmtCount } from '../data/mock'
import { useKols, hueFor, shortAddr } from '../data/kols'
import { Avatar, Button, Pnl, Change, Stat, Tag, Verified, Panel, IconButton, Empty } from '../components/ui'

export default function Kol() {
  const { handle } = useParams()
  const { kols, loading } = useKols()
  const k = kols.find((x) => x.handle.toLowerCase() === handle?.toLowerCase())
  if (loading) return <div className="text-text-secondary">Loading…</div>
  if (!k) return <Empty title="KOL not found" body={`@${handle} isn't on the FOMO leaderboard yet.`} action={<Button to="/kols" variant="glass">Browse KOLs</Button>} />
  const my = coinsFor(k.handle)
  const fees = my.reduce((s, c) => s + c.feesEth, 0)
  const endorsed = isEndorsed(k.handle)
  const hue = hueFor(k.handle)
  const rank24 = k.rank['24h']

  return (
    <div className="max-w-[980px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Leaderboard</Link>

      <Panel strong className="p-5 md:p-7 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(700px 240px at 15% 0%, hsl(${hue} 80% 60% / .22), transparent 70%)` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={k.name} hue={hue} src={k.avatar} size={72} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[24px] md:text-[30px] font-bold leading-tight"><span className="truncate">{k.name}</span> {endorsed && <Verified className="scale-125" />}</div>
              <div className="text-text-secondary text-[15px] truncate">@{k.handle}{k.clan ? ` in ${k.clan}` : ''}{rank24 ? `, #${rank24} today` : ''}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {k.wallets.evm ? <Tag tone="green"><ShieldCheck size={12} /> {shortAddr(k.wallets.evm)}</Tag> : <Tag tone="yellow"><Clock size={12} /> Wallet pending</Tag>}
                {endorsed && <Tag tone="primary">Endorsing, 2× fees</Tag>}
              </div>
            </div>
          </div>
          <IconButton label="Share" className="shrink-0"><Share size={18} /></IconButton>
        </div>

        {k.description && <p className="relative mt-4 text-[15px] text-text-secondary max-w-[60ch]">{k.description}</p>}

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Stat label="PnL today" value={<Pnl value={k.pnl['24h'] ?? 0} compact />} />
          <Stat label="PnL 7 days" value={<Pnl value={k.pnl['7d'] ?? 0} compact />} sub={k.pnl.all != null ? <span className="text-text-secondary">all time <Pnl value={k.pnl.all} compact className="text-[13px]" /></span> : undefined} />
          <Stat label="Earned on MAIN" value={<span className="text-green">+{fees.toFixed(2)} ETH</span>} sub={<span className="text-text-secondary">about {fmtUsd(fees * 2501)}</span>} />
          <Stat label="Coins" value={my.length} sub={<span className="text-text-secondary">{my.filter((c) => c.endorsed).length} endorsed</span>} />
        </div>

        <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5"><Users size={14} /> {fmtCount(k.followers)} followers</span>
          <span className="inline-flex items-center gap-1.5"><Repeat size={14} /> {k.trades.toLocaleString()} trades</span>
          {k.wallets.evm && (
            <a href={`https://robinhoodchain.blockscout.com/address/${k.wallets.evm}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-text-primary">
              <ExternalLink size={14} /> Wallet on Robinhood Chain
            </a>
          )}
        </div>

        <div className="relative mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button variant="primary" size="lg" to={`/launch?kol=${k.handle}`} className="flex-1"><Rocket size={18} /> Launch a coin for {k.name}</Button>
          {!endorsed && <Button variant="glass" size="lg" className="flex-1">I am {k.name}, claim my fees</Button>}
        </div>
      </Panel>

      <div className="mt-6">
        <h2 className="text-[20px] mb-3">Coins for @{k.handle}</h2>
        {my.length === 0 ? (
          <Empty title="No coin yet" body={`Be the first to launch for ${k.name}. You keep 0.5% of every trade, forever.`} action={<Button to={`/launch?kol=${k.handle}`}><Rocket size={16} /> Launch the first</Button>} />
        ) : (
          <Panel className="overflow-hidden">
            {my.map((c, i) => (
              <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-[72px] ${i ? 'hair' : ''}`}>
                <Avatar name={c.symbol} hue={c.hue} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-bold"><span>{c.symbol}</span><span className="text-text-secondary font-medium truncate">{c.name}</span>{c.endorsed && <Tag tone="primary">Endorsed</Tag>}</div>
                  <div className="text-text-secondary text-[14px]">{fmtUsd(c.mcap, { compact: true })} mcap, {c.holders} holders, {c.createdAt} ago</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular">+{c.feesEth.toFixed(2)} ETH</div>
                  <Change value={c.change24h} className="text-[13px]" />
                </div>
              </Link>
            ))}
          </Panel>
        )}
      </div>
    </div>
  )
}
