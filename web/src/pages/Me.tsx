import { Wallet, Rocket, ArrowDownToLine, BadgeCheck } from 'lucide-react'
import { Button, Panel, Stat, Empty } from '../components/ui'

export default function Me() {
  const connected = false
  return (
    <div className="max-w-[820px] mx-auto">
      <h1 className="text-[34px] md:text-[44px] leading-none">You</h1>
      <p className="text-text-secondary mt-2 text-[15px] max-w-[56ch]">Your launches, your fees, and the coins that carry your name.</p>

      {!connected ? (
        <Panel strong className="mt-6 p-6 md:p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full glass grid place-items-center"><Wallet size={24} /></div>
          <h2 className="text-[22px] mt-4">Connect a wallet</h2>
          <p className="text-text-secondary text-[15px] mt-1 max-w-[46ch] mx-auto">MetaMask, Rabby or Coinbase Wallet on Robinhood Chain. You only need it to launch. Trading happens in FOMO.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button variant="primary" size="lg"><Wallet size={18} /> Connect wallet</Button>
            <Button variant="glass" size="lg"><BadgeCheck size={18} /> I'm a KOL, claim with X</Button>
          </div>
        </Panel>
      ) : null}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Stat label="Launched" value="0" />
        <Stat label="Earned as launcher" value={<span className="text-green">0 ETH</span>} />
        <Stat label="Earned as KOL" value={<span className="text-green">0 ETH</span>} />
        <Stat label="Claimable now" value="0 ETH" />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="text-[18px] mb-2.5">Your launches</h2>
          <Empty title="Nothing launched yet" body="Pick a KOL and launch. You earn 0.5% of every trade on that coin." action={<Button to="/launch" size="sm"><Rocket size={16} /> Launch a coin</Button>} />
        </div>
        <div>
          <h2 className="text-[18px] mb-2.5">Payouts</h2>
          <Empty title="No payouts yet" body="Fees are paid out automatically in ETH. You'll see every payout here." action={<Button variant="glass" size="sm" disabled><ArrowDownToLine size={16} /> Withdraw</Button>} />
        </div>
      </div>
    </div>
  )
}
