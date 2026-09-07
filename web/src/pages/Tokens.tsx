import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { fmtUsd } from '../data/mock'
import { useKols, hueFor } from '../data/kols'
import { useCoins, fmtEth, ago } from '../data/coins'
import { Avatar, Segment, Tag, Verified, Panel, Pill, Empty, Button } from '../components/ui'
import { short } from '../components/Connect'

type Sort = 'New' | 'Market cap' | 'Volume' | 'Fees'
type Kind = 'All' | 'KOL' | 'Clan' | 'Graduated'

export default function Tokens() {
  const { coins, loading, demo } = useCoins({ refreshMs: 30_000 })
  const { kols } = useKols()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('New')
  const [kind, setKind] = useState<Kind>('All')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return coins
      .filter((c) => (kind === 'All' ? true : kind === 'Graduated' ? c.graduated : kind === 'KOL' ? c.kind === 'KOL' : c.kind === 'CLAN'))
      .filter((c) => !s || (c.symbol + ' ' + c.name + ' ' + c.kolRef + ' ' + c.address).toLowerCase().includes(s))
      .sort((a, b) => (sort === 'New' ? (b.launchedAt ?? 0) - (a.launchedAt ?? 0) : sort === 'Market cap' ? b.mcapUsd - a.mcapUsd : sort === 'Volume' ? b.volumeEth - a.volumeEth : b.feesEth - a.feesEth))
  }, [coins, q, sort, kind])

  const totalVol = coins.reduce((s, c) => s + c.volumeEth, 0)
  const totalToKols = coins.reduce((s, c) => s + c.toKolEth, 0)
  const avatarFor = (kolRef: string, logo: string | null) => logo ?? kols.find((k) => k.handle.toLowerCase() === kolRef.toLowerCase())?.avatar

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[34px] md:text-[44px] leading-none">Tokens</h1>
          <p className="text-text-secondary mt-2 text-[15px]">Every coin launched on MAIN, live from Robinhood Chain.</p>
        </div>
        <div className="well h-11 rounded-full flex items-center gap-2 px-4 w-full sm:w-80">
          <Search size={16} className="text-text-secondary" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticker, name, KOL or address" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-[640px]">
        {[
          ['Coins', String(coins.length)],
          ['Volume', fmtEth(totalVol, 2)],
          ['Paid to KOLs', fmtEth(totalToKols, 3)],
        ].map(([l, v]) => (
          <div key={l} className="well rounded-2xl px-4 py-3"><div className="text-[13px] text-text-secondary">{l}</div><div className="text-[18px] font-bold tabular">{v}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-0.5">{(['All', 'KOL', 'Clan', 'Graduated'] as Kind[]).map((k) => <Pill key={k} active={kind === k} onClick={() => setKind(k)}>{k}</Pill>)}</div>
        <Segment options={['New', 'Market cap', 'Volume', 'Fees'] as Sort[]} value={sort} onChange={setSort} />
        <span className="ml-auto text-[13px] text-text-secondary tabular">{list.length} coin{list.length === 1 ? '' : 's'}{demo ? ', demo' : ''}</span>
      </div>

      {loading && <div className="text-text-secondary">Loading coins</div>}
      {!loading && list.length === 0 && (
        <Empty title={coins.length === 0 ? 'No coins yet' : 'Nothing matches'} body={coins.length === 0 ? 'The first coin launched on MAIN will show up here.' : 'Try another ticker, KOL or address.'} action={coins.length === 0 ? <Button to="/launch" size="sm">Launch the first</Button> : undefined} />
      )}

      {list.length > 0 && (
        <Panel className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_140px_120px_120px_130px_90px] items-center px-5 h-11 text-[13px] text-text-secondary font-semibold">
            <span>Coin</span><span className="text-right">Market cap</span><span className="text-right">Volume</span><span className="text-right">Buyers</span><span className="text-right">To the KOL</span><span className="text-right">Age</span>
          </div>
          {list.map((c, i) => (
            <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_120px_120px_130px_90px] items-center gap-3 px-4 md:px-5 h-[72px] md:h-[68px] ${i ? 'hair' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={avatarFor(c.kolRef, c.logo)} size={44} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold text-[16px] leading-tight"><span className="truncate">${c.symbol}</span>{c.endorsed && <Verified />}{c.graduated && <Tag tone="green">Graduated</Tag>}{c.kind === 'CLAN' && <Tag tone="primary">Clan</Tag>}</div>
                  <div className="text-text-secondary text-[13px] truncate">{c.name}, for {c.kind === 'KOL' ? '@' : ''}{c.kolRef}{c.launcher ? `, by ${short(c.launcher)}` : ''}</div>
                  <div className="md:hidden text-[12px] mt-0.5 text-text-secondary">{fmtUsd(c.mcapUsd, { compact: true })} mcap, {fmtEth(c.volumeEth, 2)} vol</div>
                </div>
              </div>
              <div className="md:hidden text-right"><div className="text-green font-bold tabular text-[14px]">+{fmtEth(c.toKolEth)}</div><div className="text-[12px] text-text-secondary">{c.launchedAt ? ago(c.launchedAt) : 'demo'}</div></div>
              <div className="hidden md:block text-right font-bold tabular">{fmtUsd(c.mcapUsd, { compact: true })}</div>
              <div className="hidden md:block text-right tabular">{fmtEth(c.volumeEth, 2)}</div>
              <div className="hidden md:block text-right tabular">{c.buyers}</div>
              <div className="hidden md:block text-right text-green font-bold tabular">+{fmtEth(c.toKolEth)}</div>
              <div className="hidden md:block text-right text-text-secondary text-[13px]">{c.launchedAt ? `${ago(c.launchedAt)} ago` : 'demo'}</div>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  )
}
