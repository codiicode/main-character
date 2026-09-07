import { Rocket, Coins, BadgeCheck, ArrowRight } from 'lucide-react'
import { Button, Panel } from '../components/ui'

const steps = [
  { icon: Rocket, title: 'Someone launches a coin for a KOL', body: 'Pick any trader on the FOMO leaderboard, name the coin, pay 0.0005 ETH plus gas. The coin goes live on Pons V2 and shows up in FOMO right away.' },
  { icon: Coins, title: 'Fees flow to the KOL automatically', body: 'Every trade pays a 3.7% fee. 1.0% goes to the KOL\'s own FOMO wallet in ETH, 0.5% to whoever launched, and the rest to MAIN. No claiming, no forms.' },
  { icon: BadgeCheck, title: 'The KOL endorses and doubles their share', body: 'Log in with X on MAIN. The endorsed coin gets a badge, the KOL\'s share becomes 2.0%, and MAIN\'s share drops to 1.2%. The launcher keeps 0.5%.' },
]

const faq = [
  ['Does the KOL have to agree first?', 'No. Fees go to their wallet from the first trade whether they know or not. Endorsing is optional and doubles what they get.'],
  ['Which wallet gets paid?', 'The EVM wallet FOMO created for that trader, the same one they use on Robinhood Chain. We read it from the FOMO leaderboard and check it on-chain.'],
  ['What if a KOL has no wallet yet?', 'Launch stays locked for them until FOMO has an EVM wallet on record. You can request the KOL and we\'ll unlock when it resolves.'],
  ['Where does the coin trade?', 'On Pons V2, the biggest launchpad on Robinhood Chain. It starts on a bonding curve and graduates into a locked Uniswap V4 pool. FOMO lists it automatically.'],
  ['Can the fee split change later?', 'The 3% creator tax is locked at launch. Only the split between KOL and MAIN moves, and only when the KOL endorses.'],
  ['Who can trigger payouts?', 'Anyone. Payouts are permissionless and MAIN runs them automatically, so KOLs never have to do anything.'],
]

export default function HowItWorks() {
  return (
    <div className="max-w-[860px] mx-auto">
      <h1 className="text-[34px] md:text-[48px] leading-none max-w-[16ch]">A coin for every main character.</h1>
      <p className="text-text-secondary mt-3 text-[16px] max-w-[56ch] leading-relaxed">MAIN pairs a memecoin with a real trader and routes the trading fees to them. Three steps, one wallet, nothing to claim.</p>

      <div className="mt-8 grid gap-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <Panel key={title} strong={i === 1} className="p-5 md:p-6 flex gap-4">
            <div className="glass w-11 h-11 rounded-2xl grid place-items-center shrink-0"><Icon size={20} /></div>
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
            { label: 'Before endorsement', rows: [['KOL', '1.0%', 'bg-green'], ['Launcher', '0.5%', 'bg-warning'], ['MAIN', '2.2%', 'bg-primary']] },
            { label: 'After endorsement', rows: [['KOL', '2.0%', 'bg-green'], ['Launcher', '0.5%', 'bg-warning'], ['MAIN', '1.2%', 'bg-primary']] },
          ].map(({ label, rows }) => (
            <div key={label} className="well rounded-2xl p-4">
              <div className="text-[13px] text-text-secondary mb-2">{label}</div>
              <div className="h-3 rounded-full overflow-hidden flex bg-black/40 p-[2px] gap-[2px]">
                {rows.map(([n, v, c]) => <div key={n} className={`rounded-full ${c}`} style={{ width: `${(parseFloat(v) / 3.7) * 100}%` }} />)}
              </div>
              <div className="mt-3 grid gap-1.5 text-[14px]">
                {rows.map(([n, v, c]) => (
                  <div key={n} className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${c}`} /> <span className="text-text-secondary flex-1">{n}</span><span className="font-bold tabular">{v}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-text-tertiary text-[13px] mt-3">3.7% = Pons's 1% swap fee (70% to the creator side) plus a 3% creator tax set at launch. Pons keeps its 0.3%.</p>
      </Panel>

      <h2 className="text-[22px] mt-10 mb-3">Questions</h2>
      <Panel className="overflow-hidden">
        {faq.map(([q, a], i) => (
          <details key={q} className={`group ${i ? 'hair' : ''}`}>
            <summary className="cursor-pointer list-none px-5 py-4 font-bold text-[16px] flex items-center justify-between gap-3 row-hover">{q}<ArrowRight size={16} className="text-text-secondary transition-transform group-open:rotate-90 shrink-0" /></summary>
            <p className="px-5 pb-4 -mt-1 text-text-secondary text-[15px] max-w-[64ch] leading-relaxed">{a}</p>
          </details>
        ))}
      </Panel>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Button size="lg" to="/launch"><Rocket size={18} /> Launch a coin</Button>
        <Button size="lg" variant="glass" to="/kols">Browse KOLs</Button>
      </div>
    </div>
  )
}
