import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import { ShareButton } from '../components/ShareCard'
import { useWatchlist, watchKey } from '../data/watchlist'
import { fmtUsd, fmtCount } from '../data/mock'
import { useAllKols, resolveKol, hueFor, shortAddr } from '../data/kols'
import { useCoins, coinsFor, isEndorsedRef, fmtEth, ago } from '../data/coins'
import { Avatar, Button, Pnl, Stat, Tag, Verified, Panel, IconButton, Empty } from '../components/ui'

export default function Kol() {
  const { handle } = useParams()
  const { kols, loading } = useAllKols()
  const { coins } = useCoins()
  const [lookedUp, setLookedUp] = useState(false)
  const watch = useWatchlist()
  const k = kols.find((x) => x.handle.toLowerCase() === handle?.toLowerCase())

  useEffect(() => {
    if (!loading && !k && handle && !lookedUp) resolveKol(handle).finally(() => setLookedUp(true))
  }, [loading, k, handle, lookedUp])

  if (loading || (!k && !lookedUp)) return <div className="text-text-secondary">Loading</div>
  if (!k) return <Empty title="KOL not found" body={`There is no FOMO trader called @${handle}.`} action={<Button to="/kols" variant="glass">Browse KOLs</Button>} />
  const my = coinsFor(coins, k.handle)
  const earned = my.reduce((s, c) => s + c.toKolEth, 0)
  const endorsed = isEndorsedRef(coins, k.handle)
  const hue = hueFor(k.handle)
  const rank24 = k.rank['24h']

  return (
    <div className="max-w-[980px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Leaderboard</Link>

      <Panel strong className="p-5 md:p-7 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(700px 240px at 15% 0%, hsl(${hue} 80% 60% / .22), transparent 70%)` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={k.name} hue={hue} src={k.avatar} large size={88} glow />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[24px] md:text-[30px] font-bold leading-tight"><span className="truncate">{k.name}</span> {endorsed && <Verified className="scale-125" />}</div>
              <div className="text-text-secondary text-[15px] truncate">@{k.handle}{k.clan ? ` in ${k.clan}` : ''}{rank24 ? `, #${rank24} today` : ''}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {k.wallets.evm ? <Tag tone="green">{shortAddr(k.wallets.evm)}</Tag> : <Tag tone="yellow">Wallet pending</Tag>}
                {endorsed && <Tag tone="primary">Endorsing, 2× fees</Tag>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <IconButton label="Watch" className={watch.has(watchKey('kol', k.handle)) ? 'text-warning' : ''} onClick={() => watch.toggle(watchKey('kol', k.handle))}><Star size={18} fill={watch.has(watchKey('kol', k.handle)) ? 'currentColor' : 'none'} /></IconButton>
            <ShareButton size="sm" input={{ title: k.name, subtitle: `@${k.handle} on MAIN`, line: my.length ? `${endorsed ? '2%' : '1%'} of every trade goes to @${k.handle}` : `Launch a coin for @${k.handle}`, stat: earned > 0 ? `+${fmtEth(earned)} paid so far` : `${fmtCount(k.followers)} followers on FOMO`, avatar: k.avatar, hue, url: `${location.origin}/kol/${k.handle}`, endorsed }} />
          </div>
        </div>

        {k.description && <p className="relative mt-4 text-[15px] text-text-secondary max-w-[60ch]">{k.description}</p>}

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Stat label="PnL today" value={<Pnl value={k.pnl['24h'] ?? 0} compact />} />
          <Stat label="PnL 7 days" value={k.pnl['7d'] != null ? <Pnl value={k.pnl['7d']} compact /> : <span className="text-text-tertiary">—</span>} sub={k.pnl.all != null ? <span className="text-text-secondary">all time <Pnl value={k.pnl.all} compact className="text-[13px]" /></span> : undefined} />
          <Stat label="Earned on MAIN" value={<span className="text-green">+{fmtEth(earned)}</span>} sub={<span className="text-text-secondary">about {fmtUsd(earned * 2500)}</span>} />
          <Stat label="Coins" value={my.length} sub={<span className="text-text-secondary">{my.filter((c) => c.endorsed).length} endorsed</span>} />
        </div>

        <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-text-secondary">
          <span>{fmtCount(k.followers)} followers</span>
          <span>{k.trades.toLocaleString()} trades</span>
          {k.wallets.evm && <a href={`https://robinhoodchain.blockscout.com/address/${k.wallets.evm}`} target="_blank" rel="noreferrer" className="hover:text-text-primary underline underline-offset-4 decoration-white/20">Wallet on Robinhood Chain</a>}
        </div>

        <div className="relative mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button variant="primary" size="lg" to={`/launch?kol=${k.handle}`} className="flex-1">Launch a coin for {k.name}</Button>
          {k.clan && <Button variant="glass" size="lg" to={`/launch?clan=${encodeURIComponent(k.clan)}`} className="flex-1">Launch for the {k.clan} clan</Button>}
          {!endorsed && my.length > 0 && <Button variant="glass" size="lg" to={`/endorse/${my[0].address}`} className="flex-1">I am {k.name}, endorse</Button>}
        </div>
      </Panel>

      <div className="mt-6">
        <h2 className="text-[20px] mb-3">Coins for @{k.handle}</h2>
        {my.length === 0 ? (
          <Empty title="No coin yet" body={`Be the first to launch for ${k.name}. You keep 0.5% of every trade, forever.`} action={<Button to={`/launch?kol=${k.handle}`}>Launch the first</Button>} />
        ) : (
          <Panel className="overflow-hidden">
            {my.map((c, i) => (
              <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-[72px] ${i ? 'hair' : ''}`}>
                <Avatar name={c.symbol} hue={hue} src={c.logo ?? k.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-bold"><span>${c.symbol}</span><span className="text-text-secondary font-medium truncate">{c.name}</span>{c.endorsed && <Tag tone="primary">Endorsed</Tag>}{c.graduated && <Tag tone="green">Graduated</Tag>}</div>
                  <div className="text-text-secondary text-[14px]">{fmtUsd(c.mcapUsd, { compact: true })} mcap, {c.buyers} buyers{c.launchedAt ? `, ${ago(c.launchedAt)} ago` : ''}</div>
                </div>
                <div className="text-right"><div className="font-bold tabular text-green">+{fmtEth(c.toKolEth)}</div><div className="text-[12px] text-text-secondary">to @{k.handle}</div></div>
              </Link>
            ))}
          </Panel>
        )}
      </div>
    </div>
  )
}
