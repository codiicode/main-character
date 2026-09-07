import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ShieldCheck, Clock, ImagePlus, Rocket, Info } from 'lucide-react'
import { isEndorsed } from '../data/mock'
import { useKols, hueFor, shortAddr } from '../data/kols'
import { Avatar, Button, Pnl, Tag, Verified, Panel } from '../components/ui'

const field = 'well w-full h-12 rounded-xl focus:border-primary/60 outline-none px-4 text-[16px] placeholder:text-text-tertiary transition-colors'

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

  return (
    <div className="max-w-[1080px] mx-auto">
      <h1 className="text-[34px] md:text-[44px] leading-none">Launch a coin</h1>
      <p className="text-text-secondary mt-2 text-[16px] max-w-[56ch]">Pick the main character. Fees go to their FOMO wallet from the first trade, and you keep 0.5% of every trade, forever.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[380px_1fr]">
        {/* Choose KOL */}
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-[16px]">Choose a KOL</span>
            <span className="text-[12px] text-text-secondary">{kols.length} on FOMO</span>
          </div>
          <div className="well h-11 rounded-xl flex items-center gap-2 px-3">
            <Search size={16} className="text-text-secondary" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FOMO handle" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
          </div>
          <div className="mt-2 max-h-[440px] overflow-y-auto scrollbar-none -mx-1 px-1">
            {loading && <div className="p-4 text-text-secondary text-[14px]">Loading traders</div>}
            {list.map((k) => {
              const active = sel?.toLowerCase() === k.handle.toLowerCase()
              return (
                <button
                  key={k.handle}
                  onClick={() => setSel(k.handle)}
                  className={`w-full flex items-center gap-3 px-2 h-16 rounded-2xl text-left transition-all ${active ? 'glass' : 'hover:bg-white/5'}`}
                >
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold truncate"><span className="truncate">{k.name}</span> {isEndorsed(k.handle) && <Verified />}</div>
                    <div className="text-[13px] text-text-secondary truncate">@{k.handle}{k.wallets.evm ? '' : ', wallet pending'}</div>
                  </div>
                  <Pnl value={k.pnl['7d'] ?? k.pnl['24h'] ?? 0} compact className="text-[14px]" />
                </button>
              )
            })}
            {!loading && q && list.length === 0 && (
              <div className="p-4 text-center text-[14px] text-text-secondary">
                @{q.trim()} isn't on the list yet. <button className="text-[#aab5ff] font-bold">Request them</button>
                <div className="text-[12px] mt-1 text-text-tertiary">We resolve their FOMO wallet first, then launch unlocks.</div>
              </div>
            )}
          </div>
        </Panel>

        <section className="grid gap-5 content-start">
          <Panel className="p-4 md:p-5">
            <div className="font-bold text-[16px] mb-3">Coin details</div>
            {kol && (
              <div className="mb-4 well rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={kol.name} hue={hueFor(kol.handle)} src={kol.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">Paired with {kol.name} <span className="text-text-secondary font-medium">@{kol.handle}</span></div>
                  <div className="text-[13px] mt-1">{kol.wallets.evm ? <Tag tone="green"><ShieldCheck size={12} /> {shortAddr(kol.wallets.evm)} on Robinhood Chain</Tag> : <Tag tone="yellow"><Clock size={12} /> Resolving wallet, launch locked</Tag>}</div>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-[1fr_140px] gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Coin name" className={field} />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))} placeholder="TICKER" className={`${field} uppercase`} />
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={3} className={`${field} h-auto py-3 mt-3 resize-none`} />
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <button className="h-28 rounded-2xl border border-dashed border-white/15 hover:border-primary/60 hover:bg-white/3 text-text-secondary flex flex-col items-center justify-center gap-1.5 text-[14px] transition-colors"><ImagePlus size={22} /> Add an image</button>
              <div className="grid gap-3">
                <input placeholder="X link (optional)" className={field} />
                <input placeholder="Website (optional)" className={field} />
              </div>
            </div>
          </Panel>

          <Panel strong className="p-4 md:p-5">
            <div className="font-bold text-[16px] mb-3">Review and launch</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="well rounded-2xl p-3.5">
                <div className="text-[13px] text-text-secondary mb-2">On every trade</div>
                <div className="h-3 rounded-full overflow-hidden flex bg-black/40 p-[2px] gap-[2px]"><div className="rounded-full bg-green" style={{ width: '66.6%' }} /><div className="rounded-full bg-warning flex-1" /></div>
                <div className="mt-2.5 grid grid-cols-2 text-[13px]">
                  <div><span className="text-green font-bold text-[15px]">1%</span><br />to the KOL</div>
                  <div><span className="text-warning font-bold text-[15px]">0.5%</span><br />to you</div>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2.5 flex items-start gap-1"><Info size={12} className="mt-0.5 shrink-0" /> When the KOL endorses, their share doubles to 2%. Your 0.5% never changes.</div>
              </div>
              <div className="well rounded-2xl p-3.5">
                <div className="text-[13px] text-text-secondary mb-2">Buy at launch (optional)</div>
                <div className="flex items-center gap-2">
                  <input value={devBuy} onChange={(e) => setDevBuy(e.target.value)} className="glass w-full h-11 rounded-xl px-4 text-[16px] outline-none tabular" />
                  <span className="font-bold">ETH</span>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2.5">Launch fee 0.0005 ETH plus gas. 1B supply, liquidity locked on Pons V2.</div>
              </div>
            </div>
            <Button variant="primary" size="lg" className="w-full mt-4" disabled={!canLaunch}><Rocket size={18} /> Connect wallet and launch</Button>
            {!canLaunch && <p className="text-text-tertiary text-[12px] text-center mt-2">{!kol ? 'Pick a KOL to continue' : !kol.wallets.evm ? 'This KOL\'s wallet is still resolving' : 'Add a name and ticker'}</p>}
          </Panel>
        </section>
      </div>
    </div>
  )
}
