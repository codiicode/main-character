import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Flame, Rocket } from 'lucide-react'
import { kols, coins, fmtUsd } from '../data/mock'
import { Avatar, Button, Pnl, Change, Segment, Tag, Verified, Pill } from '../components/ui'

type Window = '24h' | '7d' | '30d' | 'All'
const pnlFor = (k: (typeof kols)[number], w: Window) =>
  w === '24h' ? k.pnl24h : w === '7d' ? k.pnl7d : w === '30d' ? k.pnl30d : k.pnlAll

function Medal({ rank }: { rank: number }) {
  if (rank > 3) return <span className="w-7 text-center text-text-secondary tabular text-[14px]">{rank}.</span>
  const colors = ['#f5c542', '#c9ced6', '#d08a4e']
  return (
    <span
      className="w-7 h-7 grid place-items-center rounded-full text-[12px] font-bold text-black"
      style={{ background: `radial-gradient(circle at 35% 30%, #fff8, transparent 40%), ${colors[rank - 1]}` }}
    >
      {rank}
    </span>
  )
}

export default function Home() {
  const [win, setWin] = useState<Window>('24h')
  const [filter, setFilter] = useState<'All' | 'Endorsed' | 'Unclaimed'>('All')
  const ranked = [...kols].sort((a, b) => pnlFor(b, win) - pnlFor(a, win))
  const shown = ranked.filter((k) => (filter === 'All' ? true : filter === 'Endorsed' ? k.endorsed : !k.endorsed))
  const trending = [...coins].sort((a, b) => b.vol24h - a.vol24h)

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
      {/* Left: leaderboard */}
      <section className="min-w-0">
        <div className="mb-5">
          <h1 className="text-[32px] md:text-[40px] leading-[1.05]">
            Every trader is a <span className="text-primary">main character.</span>
          </h1>
          <p className="text-text-secondary mt-2 text-[15px] md:text-base max-w-xl">
            Launch a coin for any KOL. Trading fees go straight to their wallet, automatically. If they endorse it, their share doubles.
          </p>
          <div className="mt-4 flex gap-2 md:hidden">
            <Button variant="primary" to="/launch" className="flex-1"><Rocket size={18} /> Launch a coin</Button>
          </div>
        </div>

        {/* Top earners strip */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-[15px] font-bold mb-2.5">
            <Flame size={16} className="text-warning" /> Top fee earners this week
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            {trending.slice(0, 4).map((c) => {
              const k = kols.find((x) => x.handle === c.kol)!
              return (
                <Link key={c.address} to={`/kol/${k.handle}`} className="card rounded-2xl p-3 min-w-[168px] hover:bg-bg-tertiary-solid transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar name={k.name} hue={k.hue} size={28} />
                    <span className="font-bold text-[15px] truncate">{k.handle}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Avatar name={c.symbol} hue={c.hue} size={22} />
                    <span className="text-green font-bold tabular">+{c.feesEth.toFixed(2)} ETH</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1">
            {(['All', 'Endorsed', 'Unclaimed'] as const).map((f) => (
              <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
            ))}
          </div>
          <Segment options={['24h', '7d', '30d', 'All'] as Window[]} value={win} onChange={setWin} />
        </div>

        {/* List */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[40px_1fr_150px_120px_120px] items-center px-4 h-10 text-[13px] text-text-secondary font-medium border-b border-white/5">
            <span>#</span><span>Trader</span><span className="text-right">PnL {win}</span><span className="text-right">Coins</span><span className="text-right">Fees earned</span>
          </div>
          {shown.map((k, i) => {
            const rank = ranked.indexOf(k) + 1
            const myCoins = coins.filter((c) => c.kol === k.handle)
            const fees = myCoins.reduce((s, c) => s + c.feesEth, 0)
            return (
              <Link
                key={k.handle}
                to={`/kol/${k.handle}`}
                className={`grid grid-cols-[32px_1fr_auto] md:grid-cols-[40px_1fr_150px_120px_120px] items-center gap-2 md:gap-2 px-3 md:px-4 h-[72px] md:h-16 hover:bg-bg-tertiary-solid transition-colors ${
                  i !== 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <Medal rank={rank} />
                <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                  <Avatar name={k.name} hue={k.hue} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[16px] md:text-base leading-tight truncate">
                      <span className="truncate">{k.name}</span> {k.endorsed && <Verified />}
                    </div>
                    <div className="text-text-secondary text-[13px] md:text-[14px] truncate">@{k.handle}</div>
                    <div className="md:hidden text-[12px] mt-0.5 whitespace-nowrap truncate">
                      {myCoins.length > 0 ? (
                        <><span className="text-green tabular font-bold">+{fees.toFixed(2)} ETH</span><span className="text-text-secondary"> · {myCoins.length} coin{myCoins.length > 1 ? 's' : ''}</span></>
                      ) : (
                        <span className="text-[#9aa8ff] font-bold">Be first to launch</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Pnl value={pnlFor(k, win)} className="md:hidden text-[16px]" compact />
                  <Pnl value={pnlFor(k, win)} className="hidden md:inline text-base" />
                  <div className="md:hidden flex justify-end -space-x-1.5 mt-1 h-5">
                    {myCoins.slice(0, 3).map((c) => <Avatar key={c.address} name={c.symbol} hue={c.hue} size={20} className="ring-2 ring-bg-secondary" />)}
                  </div>
                </div>
                <div className="hidden md:flex justify-end -space-x-1.5">
                  {myCoins.slice(0, 4).map((c) => <Avatar key={c.address} name={c.symbol} hue={c.hue} size={24} className="ring-2 ring-bg-secondary" />)}
                  {myCoins.length === 0 && <Tag tone="primary">Be first</Tag>}
                </div>
                <div className="hidden md:block text-right text-green font-bold tabular">{fees > 0 ? `+${fees.toFixed(2)} ETH` : <span className="text-text-tertiary">—</span>}</div>
              </Link>
            )
          })}
          <button className="w-full h-12 text-text-secondary hover:text-text-primary text-[15px] font-medium border-t border-white/5 flex items-center justify-center gap-1">
            View all 500 traders <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Right: recent launches */}
      <aside className="min-w-0">
        <div className="md:sticky md:top-[88px]">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[20px]">Live coins</h2>
            <Segment options={['Trending', 'New', 'Graduated']} value="Trending" onChange={() => {}} />
          </div>
          <div className="card rounded-2xl overflow-hidden">
            {trending.map((c, i) => (
              <Link
                key={c.address}
                to={`/coin/${c.address}`}
                className={`flex items-center gap-3 px-4 h-[68px] hover:bg-bg-tertiary-solid transition-colors ${i !== 0 ? 'border-t border-white/5' : ''}`}
              >
                <div className="relative">
                  <Avatar name={c.symbol} hue={c.hue} size={44} />
                  {c.endorsed && <span className="absolute -bottom-0.5 -right-0.5 bg-bg-secondary rounded-full"><Verified /></span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold text-[16px] leading-tight">
                    <span className="truncate">{c.symbol}</span>
                    {c.graduated && <Tag tone="green">Graduated</Tag>}
                  </div>
                  <div className="text-text-secondary text-[14px] truncate">{fmtUsd(c.mcap, { compact: true })} MC · for @{c.kol}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular text-[15px]">+{c.feesEth.toFixed(2)} ETH</div>
                  <Change value={c.change24h} className="text-[13px]" />
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden md:block mt-4">
            <Button variant="primary" to="/launch" className="w-full" size="lg"><Rocket size={18} /> Launch a coin</Button>
            <p className="text-text-secondary text-[13px] text-center mt-2">0.0005 ETH + gas · launches on Pons V2 · listed on FOMO instantly</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
