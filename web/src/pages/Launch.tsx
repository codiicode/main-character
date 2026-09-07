import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ShieldCheck, Clock, ImagePlus, Rocket, Info } from 'lucide-react'
import { isEndorsed } from '../data/mock'
import { useKols, hueFor, shortAddr } from '../data/kols'
import { Avatar, Button, Pnl, Tag, Verified } from '../components/ui'

export default function Launch() {
  const [params] = useSearchParams()
  const { kols, loading } = useKols()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(params.get('kol'))
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [desc, setDesc] = useState('')
  const [devBuy, setDevBuy] = useState('0')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s ? kols.filter((k) => (k.handle + ' ' + k.name).toLowerCase().includes(s)) : kols
    return base.slice(0, 60)
  }, [q, kols])
  const kol = kols.find((k) => k.handle.toLowerCase() === sel?.toLowerCase())
  const canLaunch = !!kol && !!kol.wallets.evm && name.length > 1 && symbol.length > 1

  const field = 'w-full h-12 rounded-xl bg-bg-primary/60 border border-white/8 focus:border-primary/60 outline-none px-4 text-[16px] placeholder:text-text-tertiary'

  return (
    <div className="max-w-[1080px] mx-auto">
      <h1 className="text-[30px] md:text-[36px]">Launch a coin</h1>
      <p className="text-text-secondary mt-1 text-[15px]">Pick the main character. Fees go to their FOMO wallet from the first trade. You keep 0.5% of every trade, forever.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[380px_1fr]">
        {/* Step 1: pick KOL */}
        <section className="card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[13px] font-bold grid place-items-center">1</span>
            <span className="font-bold text-[16px]">Choose a KOL</span>
            <span className="ml-auto text-[12px] text-text-secondary">{kols.length} FOMO traders</span>
          </div>
          <div className="h-11 rounded-xl bg-bg-primary/60 border border-white/8 flex items-center gap-2 px-3">
            <Search size={16} className="text-text-secondary" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FOMO handle…" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
          </div>
          <div className="mt-2 max-h-[420px] overflow-y-auto scrollbar-none -mx-1 px-1">
            {loading && <div className="p-4 text-text-secondary text-[14px]">Loading traders…</div>}
            {list.map((k) => {
              const active = sel?.toLowerCase() === k.handle.toLowerCase()
              return (
                <button
                  key={k.handle}
                  onClick={() => setSel(k.handle)}
                  className={`w-full flex items-center gap-3 px-2 h-16 rounded-xl text-left transition-colors ${active ? 'bg-primary-transparent ring-1 ring-primary/50' : 'hover:bg-bg-tertiary-solid'}`}
                >
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold truncate"><span className="truncate">{k.name}</span> {isEndorsed(k.handle) && <Verified />}</div>
                    <div className="text-[13px] text-text-secondary truncate">@{k.handle} · {k.wallets.evm ? 'wallet ready' : 'wallet pending'}</div>
                  </div>
                  <Pnl value={k.pnl['7d'] ?? k.pnl['24h'] ?? 0} compact className="text-[14px]" />
                </button>
              )
            })}
            {!loading && q && list.length === 0 && (
              <div className="p-4 text-center text-[14px] text-text-secondary">
                Not on the list yet. <button className="text-primary font-bold">Request @{q.trim()}</button>
                <div className="text-[12px] mt-1 text-text-tertiary">We resolve their FOMO wallet first, then unlock launch.</div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: coin details */}
        <section className="grid gap-5">
          <div className="card rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-[13px] font-bold grid place-items-center">2</span>
              <span className="font-bold text-[16px]">Coin details</span>
            </div>
            {kol && (
              <div className="mb-4 p-3 rounded-xl bg-bg-primary/60 flex items-center gap-3">
                <Avatar name={kol.name} hue={hueFor(kol.handle)} src={kol.avatar} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">Paired with {kol.name} <span className="text-text-secondary font-medium">@{kol.handle}</span></div>
                  <div className="text-[13px] mt-0.5">{kol.wallets.evm ? <Tag tone="green"><ShieldCheck size={12} /> {shortAddr(kol.wallets.evm)} on Robinhood Chain</Tag> : <Tag tone="yellow"><Clock size={12} /> Resolving wallet · launch locked</Tag>}</div>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-[1fr_140px] gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Coin name" className={field} />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))} placeholder="TICKER" className={`${field} uppercase`} />
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={3} className={`${field} h-auto py-3 mt-3 resize-none`} />
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <button className="h-28 rounded-xl border border-dashed border-white/15 hover:border-primary/60 text-text-secondary flex flex-col items-center justify-center gap-1.5 text-[14px]"><ImagePlus size={22} /> Upload image</button>
              <div className="grid gap-3">
                <input placeholder="x.com/…" className={field} />
                <input placeholder="Website (optional)" className={field} />
              </div>
            </div>
          </div>

          <div className="card rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-[13px] font-bold grid place-items-center">3</span>
              <span className="font-bold text-[16px]">Review & launch</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-bg-primary/60 p-3">
                <div className="text-[13px] text-text-secondary mb-2">Fee split (3% creator tax + Pons share)</div>
                <div className="h-2.5 rounded-full overflow-hidden flex bg-bg-tertiary"><div className="bg-green" style={{ width: '27%' }} /><div className="bg-warning" style={{ width: '13.5%' }} /><div className="bg-primary flex-1" /></div>
                <div className="mt-2 grid grid-cols-3 text-[13px]">
                  <div><span className="text-green font-bold">1.0%</span> KOL</div>
                  <div><span className="text-warning font-bold">0.5%</span> you</div>
                  <div><span className="text-[#9aa8ff] font-bold">2.2%</span> MAIN</div>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2 flex items-start gap-1"><Info size={12} className="mt-0.5" /> If the KOL endorses, their share becomes 2.0% and MAIN drops to 1.2%. Yours never changes.</div>
              </div>
              <div className="rounded-xl bg-bg-primary/60 p-3">
                <div className="text-[13px] text-text-secondary mb-2">Initial buy (optional)</div>
                <div className="flex items-center gap-2">
                  <input value={devBuy} onChange={(e) => setDevBuy(e.target.value)} className={`${field} h-11`} />
                  <span className="font-bold">ETH</span>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2">Launch fee 0.0005 ETH + gas. Supply 1B, liquidity locked on Pons V2.</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Button variant="primary" size="lg" className="flex-1" disabled={!canLaunch}><Rocket size={18} /> Connect wallet & launch</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
