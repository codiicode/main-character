import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, X } from 'lucide-react'
import { coins, fmtUsd, isEndorsed } from '../data/mock'
import { useKols, hueFor } from '../data/kols'
import { Avatar, Pnl, Change, Tag, Verified, Panel, Pill, Empty } from '../components/ui'

type Tab = 'All' | 'KOLs' | 'Coins'

export default function SearchPage() {
  const { kols } = useKols()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('All')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const s = q.trim().toLowerCase()
  const kolHits = useMemo(() => (s ? kols.filter((k) => (k.handle + ' ' + k.name).toLowerCase().includes(s)) : kols.slice(0, 8)), [kols, s])
  const coinHits = useMemo(() => (s ? coins.filter((c) => (c.symbol + ' ' + c.name + ' ' + c.kol + ' ' + c.address).toLowerCase().includes(s)) : coins), [s])
  const showK = tab !== 'Coins'
  const showC = tab !== 'KOLs'
  const nothing = s && (!showK || kolHits.length === 0) && (!showC || coinHits.length === 0)

  return (
    <div className="max-w-[820px] mx-auto">
      <div className="panel panel-strong rounded-full h-14 flex items-center gap-3 px-5">
        <SearchIcon size={18} className="text-text-secondary" />
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search KOLs, coins or an address" className="flex-1 bg-transparent outline-none text-[17px] placeholder:text-text-tertiary" />
        {q && <button onClick={() => setQ('')} aria-label="Clear" className="text-text-secondary hover:text-text-primary"><X size={18} /></button>}
      </div>

      <div className="flex items-center gap-0.5 mt-4 mb-3">
        {(['All', 'KOLs', 'Coins'] as Tab[]).map((t) => <Pill key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Pill>)}
      </div>

      {nothing && <Empty title={`Nothing for "${q}"`} body="Try a FOMO handle, a coin ticker, or paste a token address." />}

      {showK && kolHits.length > 0 && (
        <>
          <h2 className="text-[15px] text-text-secondary font-semibold mb-2 px-1">{s ? 'KOLs' : 'Top KOLs right now'}</h2>
          <Panel className="overflow-hidden mb-5">
            {kolHits.slice(0, 12).map((k, i) => (
              <Link key={k.handle} to={`/kol/${k.handle}`} className={`row-hover flex items-center gap-3 px-4 h-16 ${i ? 'hair' : ''}`}>
                <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold truncate"><span className="truncate">{k.name}</span>{isEndorsed(k.handle) && <Verified />}</div>
                  <div className="text-[13px] text-text-secondary truncate">@{k.handle}</div>
                </div>
                <Pnl value={k.pnl['7d'] ?? 0} compact className="text-[15px]" />
              </Link>
            ))}
          </Panel>
        </>
      )}

      {showC && coinHits.length > 0 && (
        <>
          <h2 className="text-[15px] text-text-secondary font-semibold mb-2 px-1">Coins</h2>
          <Panel className="overflow-hidden">
            {coinHits.map((c, i) => (
              <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-16 ${i ? 'hair' : ''}`}>
                <Avatar name={c.symbol} hue={hueFor(c.kol)} src={kols.find((k) => k.handle.toLowerCase() === c.kol.toLowerCase())?.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-bold"><span>{c.symbol}</span>{c.endorsed && <Verified />}{c.graduated && <Tag tone="green">Graduated</Tag>}</div>
                  <div className="text-[13px] text-text-secondary truncate">{fmtUsd(c.mcap, { compact: true })} mcap for @{c.kol}</div>
                </div>
                <Change value={c.change24h} className="text-[14px]" />
              </Link>
            ))}
          </Panel>
        </>
      )}
    </div>
  )
}
