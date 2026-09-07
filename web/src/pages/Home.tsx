import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtUsd, fmtCount } from '../data/mock'
import { useKols, pnlFor, hueFor, type Window } from '../data/kols'
import { useCoins, coinsFor, isEndorsedRef, fmtEth, ago } from '../data/coins'
import { Avatar, AvatarStack, Button, Pnl, Segment, Tag, Verified, Pill, Panel } from '../components/ui'
import { short } from '../components/Connect'

function Medal({ rank }: { rank: number }) {
  if (rank > 3) return <span className="w-7 text-center text-text-secondary tabular text-[14px] font-semibold">{rank}</span>
  const colors = ['#f5c542', '#c9ced6', '#d08a4e']
  return (
    <span
      className="w-7 h-7 grid place-items-center rounded-full text-[12px] font-black text-black"
      style={{ background: `radial-gradient(circle at 35% 30%, #fffb, transparent 45%), ${colors[rank - 1]}`, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.35), 0 4px 10px -4px rgba(0,0,0,.6)' }}
    >
      {rank}
    </span>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 h-16 ${i ? 'hair' : ''}`}>
          <div className="w-7 h-4 rounded shimmer" />
          <div className="w-11 h-11 rounded-full shimmer" />
          <div className="flex-1 grid gap-1.5"><div className="h-3.5 w-32 rounded shimmer" /><div className="h-3 w-20 rounded shimmer" /></div>
          <div className="h-4 w-24 rounded shimmer" />
        </div>
      ))}
    </>
  )
}

export default function Home() {
  const [win, setWin] = useState<Window>('24h')
  const [filter, setFilter] = useState<'All' | 'Endorsed' | 'Open'>('All')
  const [coinTab, setCoinTab] = useState<'New' | 'Top' | 'Graduated'>('New')
  const [limit, setLimit] = useState(25)
  const { kols, loading, syncedAt } = useKols()
  const { coins, activity, demo, loading: coinsLoading } = useCoins({ refreshMs: 30_000 })

  const ranked = useMemo(() => kols.filter((k) => k.rank[win] != null).sort((a, b) => pnlFor(b, win) - pnlFor(a, win)), [kols, win])
  const shown = ranked.filter((k) => (filter === 'All' ? true : filter === 'Endorsed' ? isEndorsedRef(coins, k.handle) : coinsFor(coins, k.handle).length === 0))
  const byHandle = (h: string) => kols.find((k) => k.handle.toLowerCase() === h.toLowerCase())
  const top = ranked[0]
  const topHue = top ? hueFor(top.handle) : 220
  const withPhoto = kols.filter((k) => k.avatar)
  const syncedAgo = syncedAt ? Math.max(1, Math.round((Date.now() - new Date(syncedAt).getTime()) / 60000)) : null
  const shownCoins = [...coins]
    .filter((c) => (coinTab === 'Graduated' ? c.graduated : true))
    .sort((a, b) => (coinTab === 'Top' ? b.mcapUsd - a.mcapUsd : (b.launchedAt ?? 0) - (a.launchedAt ?? 0)))
  const totalToKols = coins.reduce((s, c) => s + c.toKolEth, 0)

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
      <section className="min-w-0">
        {/* Hero */}
        <div className="mb-6 md:mb-8 grid gap-5 lg:grid-cols-[1fr_300px] items-end">
          <div>
            <h1 className="text-[40px] md:text-[56px] leading-[0.98] max-w-[12ch]">Every trader is a main character.</h1>
            <p className="text-text-secondary mt-3 text-[16px] md:text-[17px] max-w-[52ch] leading-relaxed">
              Launch a coin for any KOL or clan on FOMO. Trading fees land in their wallet from the first trade. When they endorse it, their share doubles.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="lg" to="/launch">Launch a coin</Button>
              <Button variant="glass" size="lg" to="/how-it-works">How it works</Button>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <AvatarStack items={withPhoto.slice(0, 7).map((k) => ({ name: k.name, hue: hueFor(k.handle), src: k.avatar }))} size={30} max={7} />
              <span className="text-[14px] text-text-secondary">
                <b className="text-text-primary tabular">{kols.length || '—'}</b> FOMO traders on the board{coins.length > 0 && !demo ? <>, <b className="text-green tabular">{fmtEth(totalToKols)}</b> paid to them so far</> : null}
              </span>
            </div>
          </div>

          {top && (
            <Link to={`/kol/${top.handle}`} className="block">
              <Panel strong className="p-4 overflow-hidden hover:brightness-110 transition-all">
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(260px 160px at 85% 15%, hsl(${topHue} 85% 60% / .28), transparent 70%)` }} />
                <div className="relative text-[12px] font-bold text-warning">Top trader right now</div>
                <div className="relative mt-3 flex items-center gap-3">
                  <Avatar name={top.name} hue={topHue} src={top.avatar} large size={64} glow />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[18px] leading-tight"><span className="truncate">{top.name}</span>{isEndorsedRef(coins, top.handle) && <Verified />}</div>
                    <div className="text-text-secondary text-[13px] truncate">@{top.handle}, {fmtCount(top.followers)} followers</div>
                    <Pnl value={pnlFor(top, win)} className="text-[18px] mt-0.5" />
                  </div>
                </div>
                <div className="relative mt-3 text-[13px] text-text-secondary">{coinsFor(coins, top.handle).length ? `${coinsFor(coins, top.handle).length} coin on MAIN` : 'No coin yet, launch the first'}</div>
              </Panel>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-0.5">
            {(['All', 'Endorsed', 'Open'] as const).map((f) => (
              <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
            ))}
          </div>
          <Segment options={['24h', '7d', '30d', 'all'] as Window[]} value={win} onChange={setWin} />
        </div>

        {/* Leaderboard */}
        <Panel className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[40px_1fr_150px_120px_120px] items-center px-5 h-11 text-[13px] text-text-secondary font-semibold">
            <span>#</span><span>Trader</span><span className="text-right">PnL {win}</span><span className="text-right">Coins</span><span className="text-right">Earned on MAIN</span>
          </div>
          {loading && <SkeletonRows />}
          {shown.slice(0, limit).map((k) => {
            const rank = ranked.indexOf(k) + 1
            const myCoins = coinsFor(coins, k.handle)
            const earned = myCoins.reduce((s, c) => s + c.toKolEth, 0)
            const endorsed = isEndorsedRef(coins, k.handle)
            return (
              <Link key={k.handle} to={`/kol/${k.handle}`} className="hair row-hover grid grid-cols-[32px_1fr_auto] md:grid-cols-[40px_1fr_150px_120px_120px] items-center gap-2 px-3 md:px-5 h-[72px] md:h-[68px]">
                <Medal rank={rank} />
                <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={46} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[16px] leading-tight"><span className="truncate">{k.name}</span> {endorsed && <Verified />}</div>
                    <div className="text-text-secondary text-[13px] md:text-[14px] truncate">@{k.handle}{k.clan ? ` in ${k.clan}` : ''}</div>
                    <div className="md:hidden text-[12px] mt-0.5 whitespace-nowrap truncate">
                      {myCoins.length > 0 ? <><span className="text-green tabular font-bold">+{fmtEth(earned)}</span><span className="text-text-secondary"> from {myCoins.length} coin{myCoins.length > 1 ? 's' : ''}</span></> : <span className="text-[#aab5ff] font-bold">No coin yet</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Pnl value={pnlFor(k, win)} className="md:hidden text-[16px]" compact />
                  <Pnl value={pnlFor(k, win)} className="hidden md:inline text-base" />
                </div>
                <div className="hidden md:flex justify-end">{myCoins.length > 0 ? <Tag tone="green">{myCoins.length}</Tag> : <Tag tone="primary">Open</Tag>}</div>
                <div className="hidden md:block text-right text-green font-bold tabular">{earned > 0 ? `+${fmtEth(earned)}` : <span className="text-text-tertiary">—</span>}</div>
              </Link>
            )
          })}
          {!loading && shown.length > limit && (
            <button onClick={() => setLimit((l) => l + 50)} className="hair w-full h-12 text-text-secondary hover:text-text-primary text-[15px] font-semibold flex items-center justify-center gap-1 row-hover">
              Show {Math.min(50, shown.length - limit)} more
            </button>
          )}
        </Panel>
        {syncedAgo && <p className="text-text-tertiary text-[12px] mt-2 px-1">FOMO leaderboard, updated {syncedAgo < 60 ? `${syncedAgo} min` : `${Math.round(syncedAgo / 60)} h`} ago</p>}
      </section>

      {/* Right: live coins + activity */}
      <aside className="min-w-0">
        <div className="md:sticky md:top-[96px] grid gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[20px] flex items-center gap-2">Live coins {demo && <Tag tone="yellow">Demo</Tag>}</h2>
              <Segment options={['New', 'Top', 'Graduated']} value={coinTab} onChange={setCoinTab} />
            </div>
            <Panel className="overflow-hidden">
              {coinsLoading && <SkeletonRows />}
              {!coinsLoading && shownCoins.length === 0 && <div className="p-6 text-center text-text-secondary text-[14px]">No coins yet. <Link to="/launch" className="text-[#aab5ff] font-bold">Launch the first.</Link></div>}
              {shownCoins.slice(0, 8).map((c, i) => {
                const k = c.kind === 'KOL' ? byHandle(c.kolRef) : undefined
                return (
                  <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-[70px] ${i ? 'hair' : ''}`}>
                    <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={c.logo ?? k?.avatar} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-bold text-[16px] leading-tight"><span className="truncate">{c.symbol}</span>{c.endorsed && <Verified />}{c.graduated && <Tag tone="green">Graduated</Tag>}</div>
                      <div className="text-text-secondary text-[13px] truncate">{fmtUsd(c.mcapUsd, { compact: true })} mcap for {c.kind === 'KOL' ? '@' : ''}{c.kolRef}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular text-[15px] text-green">+{fmtEth(c.toKolEth)}</div>
                      <div className="text-[12px] text-text-secondary">{c.launchedAt ? `${ago(c.launchedAt)} ago` : 'demo'}</div>
                    </div>
                  </Link>
                )
              })}
            </Panel>
          </div>

          {activity.length > 0 && (
            <div>
              <h2 className="text-[20px] mb-3">Just happened</h2>
              <Panel className="overflow-hidden">
                {activity.slice(0, 8).map((a, i) => (
                  <Link key={`${a.type}-${a.block}-${i}`} to={`/coin/${a.token}`} className={`row-hover flex items-center gap-3 px-4 py-3 text-[14px] ${i ? 'hair' : ''}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'launch' ? 'bg-primary' : a.type === 'endorse' ? 'bg-warning' : 'bg-green'}`} />
                    <span className="flex-1 min-w-0 truncate">
                      {a.type === 'launch' && <>{short(a.launcher)} launched <b>${a.symbol}</b> for {a.kind === 'KOL' ? '@' : ''}{a.kolRef}</>}
                      {a.type === 'endorse' && <><b>@{a.kolRef}</b> endorsed <b>${a.symbol}</b></>}
                      {a.type === 'payout' && <><b>{fmtEth(a.eth)}</b> paid out from <b>${a.symbol}</b></>}
                    </span>
                    <span className="text-text-tertiary text-[12px] shrink-0">{ago(a.at)}</span>
                  </Link>
                ))}
              </Panel>
            </div>
          )}
          <p className="text-text-secondary text-[13px] px-1">{demo ? 'Coin data is a demo until the launch contract is deployed.' : 'Read straight from Robinhood Chain, refreshed every 30 seconds.'} 0.0005 ETH + gas to launch, trades on Pons V2, listed in FOMO instantly.</p>
        </div>
      </aside>
    </div>
  )
}
