import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { coinsFor, isEndorsed, fmtCount } from '../data/mock'
import { useKols, hueFor, pnlFor, type Window } from '../data/kols'
import { Avatar, Pnl, Segment, Tag, Verified, Panel, Pill } from '../components/ui'

type Sort = 'PnL' | 'Followers' | 'Coins'

export default function Kols() {
  const { kols, loading } = useKols()
  const [q, setQ] = useState('')
  const [win, setWin] = useState<Window>('7d')
  const [sort, setSort] = useState<Sort>('PnL')
  const [walletOnly, setWalletOnly] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let l = kols.filter((k) => !s || (k.handle + ' ' + k.name + ' ' + (k.clan ?? '')).toLowerCase().includes(s))
    if (walletOnly) l = l.filter((k) => k.wallets.evm)
    l = [...l].sort((a, b) =>
      sort === 'PnL' ? pnlFor(b, win) - pnlFor(a, win) : sort === 'Followers' ? b.followers - a.followers : coinsFor(b.handle).length - coinsFor(a.handle).length,
    )
    return l
  }, [kols, q, win, sort, walletOnly])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[34px] md:text-[44px] leading-none">KOLs</h1>
          <p className="text-text-secondary mt-2 text-[15px]">Every trader on the FOMO leaderboard, ready to be someone's main character.</p>
        </div>
        <div className="well h-11 rounded-full flex items-center gap-2 px-4 w-full sm:w-80">
          <Search size={16} className="text-text-secondary" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search handle, name or clan" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Segment options={['PnL', 'Followers', 'Coins'] as Sort[]} value={sort} onChange={setSort} />
        {sort === 'PnL' && <Segment options={['24h', '7d', '30d', 'all'] as Window[]} value={win} onChange={setWin} />}
        <Pill active={walletOnly} onClick={() => setWalletOnly((v) => !v)}>Wallet ready</Pill>
        <span className="ml-auto text-[13px] text-text-secondary tabular">{list.length} traders</span>
      </div>

      {loading && <div className="text-text-secondary">Loading traders</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((k) => {
          const my = coinsFor(k.handle)
          const endorsed = isEndorsed(k.handle)
          return (
            <Link key={k.handle} to={`/kol/${k.handle}`}>
              <Panel className="p-4 h-full hover:brightness-110 transition-all">
                <div className="flex items-center gap-3">
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold truncate"><span className="truncate">{k.name}</span>{endorsed && <Verified />}</div>
                    <div className="text-[13px] text-text-secondary truncate">@{k.handle}</div>
                  </div>
                  <Pnl value={pnlFor(k, win)} compact className="text-[15px]" />
                </div>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[12px] text-text-secondary">
                  <span>{fmtCount(k.followers)} followers</span>
                  {k.clan && <span>in {k.clan}</span>}
                  <span className="ml-auto">{my.length > 0 ? <Tag tone="green">{my.length} coin{my.length > 1 ? 's' : ''}</Tag> : k.wallets.evm ? <Tag tone="primary">Open</Tag> : <Tag tone="yellow">Wallet pending</Tag>}</span>
                </div>
              </Panel>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
