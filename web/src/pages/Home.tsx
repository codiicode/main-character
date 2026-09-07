import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Rocket, ArrowRight } from 'lucide-react'
import { coins, coinsFor, isEndorsed, fmtUsd } from '../data/mock'
import { useKols, pnlFor, hueFor, type Window } from '../data/kols'
import { Avatar, Button, Pnl, Change, Segment, Tag, Verified, Pill, Panel } from '../components/ui'

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
  const [filter, setFilter] = useState<'All' | 'Endorsed' | 'Unclaimed'>('All')
  const [limit, setLimit] = useState(25)
  const { kols, loading, syncedAt } = useKols()

  const ranked = useMemo(() => kols.filter((k) => k.rank[win] != null).sort((a, b) => pnlFor(b, win) - pnlFor(a, win)), [kols, win])
  const shown = ranked.filter((k) => (filter === 'All' ? true : filter === 'Endorsed' ? isEndorsed(k.handle) : !isEndorsed(k.handle)))
  const trending = [...coins].sort((a, b) => b.vol24h - a.vol24h)
  const byHandle = (h: string) => kols.find((k) => k.handle.toLowerCase() === h.toLowerCase())
  const totalFees = coins.reduce((s, c) => s + c.feesEth, 0)

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
      <section className="min-w-0">
        {/* Hero */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-[40px] md:text-[56px] leading-[0.98] max-w-[12ch]">Every trader is a main character.</h1>
          <p className="text-text-secondary mt-3 text-[16px] md:text-[17px] max-w-[52ch] leading-relaxed">
            Launch a coin for any KOL on FOMO. Trading fees land in their wallet from the first trade. When they endorse it, their share doubles.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button variant="primary" size="lg" to="/launch"><Rocket size={18} /> Launch a coin</Button>
            <Button variant="glass" size="lg" to="/how-it-works">How it works <ArrowRight size={16} /></Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-text-secondary">
            <span><b className="text-text-primary tabular">{kols.length || '—'}</b> FOMO traders</span>
            <span><b className="text-text-primary tabular">{coins.length}</b> live coins</span>
            <span><b className="text-green tabular">+{totalFees.toFixed(2)} ETH</b> paid to KOLs</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-0.5">
            {(['All', 'Endorsed', 'Unclaimed'] as const).map((f) => (
              <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
            ))}
          </div>
          <Segment options={['24h', '7d', '30d', 'all'] as Window[]} value={win} onChange={setWin} />
        </div>

        {/* Leaderboard */}
        <Panel className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[40px_1fr_150px_120px_120px] items-center px-5 h-11 text-[13px] text-text-secondary font-semibold">
            <span>#</span><span>Trader</span><span className="text-right">PnL {win}</span><span className="text-right">Coins</span><span className="text-right">Fees earned</span>
          </div>
          {loading && <SkeletonRows />}
          {shown.slice(0, limit).map((k) => {
            const rank = ranked.indexOf(k) + 1
            const myCoins = coinsFor(k.handle)
            const fees = myCoins.reduce((s, c) => s + c.feesEth, 0)
            const endorsed = isEndorsed(k.handle)
            return (
              <Link
                key={k.handle}
                to={`/kol/${k.handle}`}
                className="hair row-hover grid grid-cols-[32px_1fr_auto] md:grid-cols-[40px_1fr_150px_120px_120px] items-center gap-2 px-3 md:px-5 h-[72px] md:h-[68px]"
              >
                <Medal rank={rank} />
                <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[16px] leading-tight">
                      <span className="truncate">{k.name}</span> {endorsed && <Verified />}
                    </div>
                    <div className="text-text-secondary text-[13px] md:text-[14px] truncate">@{k.handle}{k.clan ? ` in ${k.clan}` : ''}</div>
                    <div className="md:hidden text-[12px] mt-0.5 whitespace-nowrap truncate">
                      {myCoins.length > 0 ? (
                        <><span className="text-green tabular font-bold">+{fees.toFixed(2)} ETH</span><span className="text-text-secondary"> from {myCoins.length} coin{myCoins.length > 1 ? 's' : ''}</span></>
                      ) : (
                        <span className="text-[#aab5ff] font-bold">No coin yet</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Pnl value={pnlFor(k, win)} className="md:hidden text-[16px]" compact />
                  <Pnl value={pnlFor(k, win)} className="hidden md:inline text-base" />
                  <div className="md:hidden flex justify-end -space-x-1.5 mt-1 h-5">
                    {myCoins.slice(0, 3).map((c) => <Avatar key={c.address} name={c.symbol} hue={c.hue} size={20} className="ring-2 ring-[#12111a]" />)}
                  </div>
                </div>
                <div className="hidden md:flex justify-end -space-x-1.5">
                  {myCoins.slice(0, 4).map((c) => <Avatar key={c.address} name={c.symbol} hue={c.hue} size={24} className="ring-2 ring-[#12111a]" />)}
                  {myCoins.length === 0 && <Tag tone="primary">Open</Tag>}
                </div>
                <div className="hidden md:block text-right text-green font-bold tabular">{fees > 0 ? `+${fees.toFixed(2)} ETH` : <span className="text-text-tertiary">—</span>}</div>
              </Link>
            )
          })}
          {!loading && shown.length > limit && (
            <button onClick={() => setLimit((l) => l + 50)} className="hair w-full h-12 text-text-secondary hover:text-text-primary text-[15px] font-semibold flex items-center justify-center gap-1 row-hover">
              Show {Math.min(50, shown.length - limit)} more <ChevronRight size={16} />
            </button>
          )}
        </Panel>
        {syncedAt && <p className="text-text-tertiary text-[12px] mt-2 px-1">FOMO leaderboard, synced {new Date(syncedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
      </section>

      {/* Right: live coins */}
      <aside className="min-w-0">
        <div className="md:sticky md:top-[96px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[20px]">Live coins</h2>
            <Segment options={['Trending', 'New', 'Graduated']} value="Trending" onChange={() => {}} />
          </div>
          <Panel className="overflow-hidden">
            {trending.map((c, i) => {
              const k = byHandle(c.kol)
              return (
                <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-[70px] ${i ? 'hair' : ''}`}>
                  <div className="relative">
                    <Avatar name={c.symbol} hue={c.hue} size={44} />
                    <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-[#12111a]"><Avatar name={k?.name ?? c.kol} hue={hueFor(c.kol)} src={k?.avatar} size={18} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-bold text-[16px] leading-tight">
                      <span className="truncate">{c.symbol}</span>
                      {c.endorsed && <Verified />}
                      {c.graduated && <Tag tone="green">Graduated</Tag>}
                    </div>
                    <div className="text-text-secondary text-[13px] truncate">{fmtUsd(c.mcap, { compact: true })} mcap for @{c.kol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular text-[15px]">+{c.feesEth.toFixed(2)} ETH</div>
                    <Change value={c.change24h} className="text-[13px]" />
                  </div>
                </Link>
              )
            })}
          </Panel>
          <p className="text-text-secondary text-[13px] mt-3 px-1">0.0005 ETH + gas to launch. Coins trade on Pons V2 and show up in the FOMO app instantly.</p>
        </div>
      </aside>
    </div>
  )
}
