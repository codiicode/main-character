import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { fmtCount } from '../data/mock'
import { useKols, hueFor, pnlFor, type Window, type Kol } from '../data/kols'
import { useCoins, coinsFor, isEndorsedRef } from '../data/coins'
import { Avatar, Pnl, Segment, Tag, Verified, Panel, Pill, AvatarStack } from '../components/ui'

type Sort = 'PnL' | 'Followers' | 'Coins'
type View = 'Traders' | 'Clans'

export default function Kols() {
  const { kols, loading } = useKols()
  const { coins } = useCoins()
  const [view, setView] = useState<View>('Traders')
  const [q, setQ] = useState('')
  const [win, setWin] = useState<Window>('7d')
  const [sort, setSort] = useState<Sort>('PnL')
  const [walletOnly, setWalletOnly] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let l = kols.filter((k) => !s || (k.handle + ' ' + k.name + ' ' + (k.clan ?? '')).toLowerCase().includes(s))
    if (walletOnly) l = l.filter((k) => k.wallets.evm)
    return [...l].sort((a, b) => (sort === 'PnL' ? pnlFor(b, win) - pnlFor(a, win) : sort === 'Followers' ? b.followers - a.followers : coinsFor(coins, b.handle).length - coinsFor(coins, a.handle).length))
  }, [kols, coins, q, win, sort, walletOnly])

  const clans = useMemo(() => {
    const m = new Map<string, Kol[]>()
    for (const k of kols) if (k.clan) m.set(k.clan, [...(m.get(k.clan) ?? []), k])
    const s = q.trim().toLowerCase()
    return [...m.entries()]
      .map(([name, members]) => ({ name, members, funded: members.filter((x) => x.wallets.evm).length, pnl: members.reduce((t, x) => t + pnlFor(x, win), 0), coins: coinsFor(coins, name).length }))
      .filter((c) => !s || c.name.toLowerCase().includes(s))
      .sort((a, b) => b.pnl - a.pnl)
  }, [kols, coins, q, win])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[34px] md:text-[44px] leading-none">{view === 'Traders' ? 'KOLs' : 'Clans'}</h1>
          <p className="text-text-secondary mt-2 text-[15px]">{view === 'Traders' ? 'Every trader on the FOMO leaderboard, ready to be someone\'s main character.' : 'Launch for a whole clan and its members split the fees.'}</p>
        </div>
        <div className="well h-11 rounded-full flex items-center gap-2 px-4 w-full sm:w-80">
          <Search size={16} className="text-text-secondary" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={view === 'Traders' ? 'Search handle, name or clan' : 'Search clans'} className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Segment options={['Traders', 'Clans'] as View[]} value={view} onChange={setView} />
        {view === 'Traders' && <Segment options={['PnL', 'Followers', 'Coins'] as Sort[]} value={sort} onChange={setSort} />}
        {(view === 'Clans' || sort === 'PnL') && <Segment options={['24h', '7d', '30d', 'all'] as Window[]} value={win} onChange={setWin} />}
        {view === 'Traders' && <Pill active={walletOnly} onClick={() => setWalletOnly((v) => !v)}>Wallet ready</Pill>}
        <span className="ml-auto text-[13px] text-text-secondary tabular">{view === 'Traders' ? `${list.length} traders` : `${clans.length} clans`}</span>
      </div>

      {loading && <div className="text-text-secondary">Loading traders</div>}

      {view === 'Traders' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((k) => {
            const my = coinsFor(coins, k.handle)
            const endorsed = isEndorsedRef(coins, k.handle)
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
      )}

      {view === 'Clans' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clans.map((c) => (
            <Link key={c.name} to={`/launch?clan=${encodeURIComponent(c.name)}`}>
              <Panel className="p-4 h-full hover:brightness-110 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <AvatarStack items={c.members.slice(0, 5).map((m) => ({ name: m.name, hue: hueFor(m.handle), src: m.avatar }))} size={36} max={5} />
                  <Pnl value={c.pnl} compact className="text-[15px]" />
                </div>
                <div className="mt-3 font-bold text-[17px]">{c.name}</div>
                <div className="text-[13px] text-text-secondary">{c.members.length} on the leaderboard, {c.funded} with wallets, combined PnL {win}</div>
                <div className="mt-3">{c.coins > 0 ? <Tag tone="green">{c.coins} coin{c.coins > 1 ? 's' : ''}</Tag> : c.funded > 0 ? <Tag tone="primary">Launch for this clan</Tag> : <Tag tone="yellow">No wallets yet</Tag>}</div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
