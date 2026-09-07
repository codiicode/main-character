import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search as SearchIcon, X } from 'lucide-react'
import { coins, fmtUsd, isEndorsed } from '../data/mock'
import { useAllKols, resolveKol, hueFor } from '../data/kols'
import { Avatar, Pnl, Change, Tag, Verified, Panel, Pill, Empty, Button } from '../components/ui'

type Tab = 'All' | 'KOLs' | 'Coins'

export default function SearchPage() {
  const { kols } = useAllKols()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('All')
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'none' | 'error'; msg?: string; candidates?: string[] }>({ state: 'idle' })
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const s = q.trim().replace(/^@/, '').toLowerCase()
  const kolHits = useMemo(() => (s ? kols.filter((k) => (k.handle + ' ' + k.name).toLowerCase().includes(s)) : kols.slice(0, 8)), [kols, s])
  const coinHits = useMemo(() => (s ? coins.filter((c) => (c.symbol + ' ' + c.name + ' ' + c.kol + ' ' + c.address).toLowerCase().includes(s)) : coins), [s])
  const showK = tab !== 'Coins'
  const showC = tab !== 'KOLs'
  const nothing = !!s && (!showK || kolHits.length === 0) && (!showC || coinHits.length === 0)

  async function doLookup(handle: string) {
    setLookup({ state: 'busy' })
    const r = await resolveKol(handle)
    if (r.kol) nav(`/kol/${r.kol.handle}`)
    else if (r.error) setLookup({ state: 'error', msg: r.error })
    else setLookup({ state: 'none', candidates: r.candidates })
  }

  return (
    <div className="max-w-[820px] mx-auto">
      <form className="panel panel-strong rounded-full h-14 flex items-center gap-3 px-5" onSubmit={(e) => { e.preventDefault(); if (s && kolHits.length === 0) void doLookup(s) }}>
        <SearchIcon size={18} className="text-text-secondary" />
        <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setLookup({ state: 'idle' }) }} placeholder="Any FOMO handle, coin or address" className="flex-1 bg-transparent outline-none text-[17px] placeholder:text-text-tertiary" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="text-text-secondary hover:text-text-primary"><X size={18} /></button>}
      </form>

      <div className="flex items-center gap-0.5 mt-4 mb-3">
        {(['All', 'KOLs', 'Coins'] as Tab[]).map((t) => <Pill key={t} active={tab === t} onClick={() => setTab(t)}>{t}</Pill>)}
      </div>

      {nothing && (
        <Empty
          title={lookup.state === 'none' ? `No FOMO trader called @${s}` : `Nothing here for "${q}"`}
          body={lookup.state === 'busy' ? `Looking up @${s} on FOMO` : lookup.state === 'error' ? lookup.msg : 'Not on the leaderboard yet. Look the handle up on FOMO directly.'}
          action={
            lookup.state === 'none' && lookup.candidates?.length ? (
              <div className="flex flex-wrap justify-center gap-1.5">{lookup.candidates.map((c) => <button key={c} onClick={() => doLookup(c)} className="glass rounded-full px-3 h-8 text-[13px] font-semibold">@{c}</button>)}</div>
            ) : lookup.state === 'idle' && showK ? (
              <Button size="sm" variant="glass" onClick={() => doLookup(s)}>Look up @{s} on FOMO</Button>
            ) : undefined
          }
        />
      )}

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
                <Pnl value={k.pnl['7d'] ?? k.pnl['24h'] ?? 0} compact className="text-[15px]" />
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
