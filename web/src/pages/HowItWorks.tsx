import { ChevronDown } from 'lucide-react'
import { Button, Panel } from '../components/ui'

const steps = [
  { title: 'Someone launches a coin for a KOL', body: 'Pick any trader on the FOMO leaderboard, name the coin, pay 0.0005 ETH plus gas. The coin goes live on Pons V2 and shows up in FOMO right away.' },
  { title: 'Fees flow automatically', body: 'On every trade, 1% goes to the KOL\'s own FOMO wallet in ETH, 0.5% to whoever launched the coin, and 0.5% buys $MAIN on the open market and burns it. No claiming, no forms.' },
  { title: 'The KOL endorses', body: 'Log in with X on MAIN to prove it\'s you. The coin gets the verified badge, so traders know the fees really reach their main character.' },
]

const faq = [
  ['Does the KOL have to agree first?', 'No. Fees go to their wallet from the first trade whether they know or not. Endorsing is optional and adds the verified badge.'],
  ['Which wallet gets paid?', 'The EVM wallet FOMO created for that trader, the same one they use on Robinhood Chain. We read it from the FOMO leaderboard and check it on-chain.'],
  ['What if a KOL has no wallet yet?', 'Launch stays locked for them until FOMO has an EVM wallet on record. You can request the KOL and we\'ll unlock when it resolves.'],
  ['Where does the coin trade?', 'On Pons V2, the biggest launchpad on Robinhood Chain. It starts on a bonding curve and graduates into a locked Uniswap V4 pool. FOMO lists it automatically.'],
  ['Can the fee split change later?', 'No. The split is locked into the coin at launch and can never be changed, not even by MAIN.'],
  ['What happens to the $MAIN burn?', 'Every coin sends 0.5% of trade volume to a vault that buys $MAIN and burns it on-chain. Anyone can trigger the burn and verify it.'],
  ['Who can trigger payouts?', 'Anyone. Payouts are permissionless and MAIN runs them automatically, so KOLs never have to do anything.'],
]

export default function HowItWorks() {
  return (
    <div className="max-w-[860px] mx-auto">
      <h1 className="text-[34px] md:text-[48px] leading-none max-w-[16ch]">A coin for every main character.</h1>
      <p className="text-text-secondary mt-3 text-[16px] max-w-[56ch] leading-relaxed">MAIN pairs a memecoin with a real trader and routes the trading fees to them. Three steps, one wallet, nothing to claim.</p>

      <div className="mt-8 grid gap-3">
        {steps.map(({ title, body }, i) => (
          <Panel key={title} strong={i === 1} className="p-5 md:p-6">
            <div>
              <h2 className="text-[19px] md:text-[21px]">{title}</h2>
              <p className="text-text-secondary text-[15px] mt-1 max-w-[62ch] leading-relaxed">{body}</p>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-8 p-5 md:p-6">
        <h2 className="text-[20px] mb-3">The fee, trade by trade</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Every coin on MAIN', rows: [['KOL', '1%', 'bg-green'], ['Launcher', '0.5%', 'bg-warning'], ['$MAIN buyback & burn', '0.5%', 'bg-dev']] },
            { label: '$MAIN itself', rows: [['Team', '1%', 'bg-green'], ['Founder', '1.8%', 'bg-warning'], ['$MAIN buyback & burn', '0.5%', 'bg-dev']] },
          ].map(({ label, rows }) => (
            <div key={label} className="well rounded-2xl p-4">
              <div className="text-[13px] text-text-secondary mb-2">{label}</div>
              <div className="h-3 rounded-full overflow-hidden flex bg-black/40 p-[2px] gap-[2px]">
                {rows.map(([n, v, c]) => <div key={n} className={`rounded-full ${c}`} style={{ width: `${(parseFloat(v) / 3.3) * 100}%` }} />)}
              </div>
              <div className="mt-3 grid gap-1.5 text-[14px]">
                {rows.map(([n, v, c]) => (
                  <div key={n} className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${c}`} /> <span className="text-text-secondary flex-1">{n}</span><span className="font-bold tabular">{v}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-tertiary text-[13px] mt-3">Paid in ETH on Robinhood Chain, on the bonding curve and after graduation alike. Pons keeps 0.3% and MAIN keeps 1.2% to run the platform.</p>
      </Panel>

      <h2 className="text-[22px] mt-10 mb-3">Questions</h2>
      <Panel className="overflow-hidden">
        {faq.map(([q, a], i) => (
          <details key={q} className={`group ${i ? 'hair' : ''}`}>
            <summary className="cursor-pointer list-none px-5 py-4 font-bold text-[16px] flex items-center justify-between gap-3 row-hover">{q}<ChevronDown size={16} className="text-text-secondary transition-transform group-open:rotate-180 shrink-0" /></summary>
            <p className="px-5 pb-4 -mt-1 text-text-secondary text-[15px] max-w-[64ch] leading-relaxed">{a}</p>
          </details>
        ))}
      </Panel>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Button size="lg" to="/launch">Launch a coin</Button>
        <Button size="lg" variant="glass" to="/kols">Browse KOLs</Button>
      </div>
    </div>
  )
}
