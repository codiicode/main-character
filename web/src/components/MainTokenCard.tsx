import { Link } from 'react-router-dom'
import { fmtUsd } from '../data/mock'
import { useCoins, fmtEth } from '../data/coins'
import { MAIN_TOKEN_ADDRESS } from '../lib/chain'
import { Button, Panel, Tag } from '../components/ui'

/** Hero card for the platform token. Coming-soon until VITE_MAIN_TOKEN is set, live stats after. */
export function MainTokenCard() {
  const { coins } = useCoins()
  const main = MAIN_TOKEN_ADDRESS ? coins.find((c) => c.address.toLowerCase() === MAIN_TOKEN_ADDRESS) : undefined

  return (
    <Panel strong className="p-6 md:p-7 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(420px 260px at 90% 0%, rgba(120,136,255,.35), transparent 70%), radial-gradient(300px 200px at 10% 100%, rgba(253,93,211,.16), transparent 70%)' }} />
      <div className="relative flex items-center gap-4">
        <div className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-2xl bg-[#0a0818] grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_16px_40px_-16px_rgba(120,136,255,.8)] shrink-0">
          <img src="/brand/logo.png" alt="MAIN" className="w-11 h-auto" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[26px] md:text-[30px] font-bold leading-none">$MAIN {main ? <Tag tone="green">Live</Tag> : <Tag tone="primary">Coming soon</Tag>}</div>
          <div className="text-text-secondary text-[14px] mt-1.5">The platform token. Every fee MAIN earns flows back to it.</div>
        </div>
      </div>

      {main ? (
        <>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              ['Market cap', fmtUsd(main.mcapUsd, { compact: true })],
              ['Volume', fmtEth(main.volumeEth, 2)],
              ['Buyers', String(main.buyers)],
            ].map(([l, v]) => (
              <div key={l} className="well rounded-xl px-3 py-2"><div className="text-[12px] text-text-secondary">{l}</div><div className="text-[16px] font-bold tabular">{v}</div></div>
            ))}
          </div>
          <div className="relative mt-4 flex gap-2">
            <Button to={`/coin/${main.address}`} className="flex-1">Open $MAIN</Button>
            <Button variant="green" href={`https://fomo.family/tokens/robinhood/${main.address}`} className="flex-1">Buy on FOMO</Button>
          </div>
        </>
      ) : (
        <>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              ['Launches on', 'Pons V2'],
              ['Fees to holders', 'Buyback'],
              ['Supply', '1B'],
            ].map(([l, v]) => (
              <div key={l} className="well rounded-xl px-3 py-2"><div className="text-[12px] text-text-secondary">{l}</div><div className="text-[16px] font-bold tabular">{v}</div></div>
            ))}
          </div>
          <div className="relative mt-4 flex gap-2">
            <Button variant="glass" to="/how-it-works" className="flex-1">How MAIN works</Button>
            <Link to="/tokens" className="flex-1"><Button variant="glass" className="w-full">All tokens</Button></Link>
          </div>
        </>
      )}
    </Panel>
  )
}
