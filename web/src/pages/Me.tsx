import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { fmtUsd } from '../data/mock'
import { useKols, hueFor } from '../data/kols'
import { useCoins, fmtEth, ago } from '../data/coins'
import { Avatar, Button, Panel, Stat, Empty, Tag, Verified } from '../components/ui'
import { ConnectButton, short } from '../components/Connect'
import { explorerAddress } from '../lib/chain'
import { useWatchlist } from '../data/watchlist'

export default function Me() {
  const { address, isConnected } = useAccount()
  const { coins } = useCoins()
  const { kols } = useKols()
  const watch = useWatchlist()
  const watchedKols = watch.kols.map((h) => kols.find((k) => k.handle.toLowerCase() === h)).filter(Boolean) as typeof kols
  const watchedCoins = watch.coins.map((a) => coins.find((c) => c.address.toLowerCase() === a)).filter(Boolean) as typeof coins
  const mine = address ? coins.filter((c) => c.launcher?.toLowerCase() === address.toLowerCase()) : []
  const asKol = address ? coins.filter((c) => c.kolAccounts.some((a) => a.toLowerCase() === address.toLowerCase())) : []
  const earnedLauncher = mine.reduce((s, c) => s + c.feesEth * 0.1563, 0)
  const earnedKol = asKol.reduce((s, c) => s + c.toKolEth / Math.max(1, c.kolAccounts.length), 0)

  return (
    <div className="max-w-[820px] mx-auto">
      <h1 className="text-[34px] md:text-[44px] leading-none">You</h1>
      <p className="text-text-secondary mt-2 text-[15px] max-w-[56ch]">Your launches, your fees, and the coins that carry your name.</p>

      {!isConnected || !address ? (
        <Panel strong className="mt-6 p-6 md:p-8 text-center">
          <h2 className="text-[22px]">Connect a wallet</h2>
          <p className="text-text-secondary text-[15px] mt-1 max-w-[46ch] mx-auto">MetaMask, Phantom, Rabby or Coinbase Wallet on Robinhood Chain. You only need it to launch. Trading happens in FOMO.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center items-center"><ConnectButton size="lg" /><Button variant="glass" size="lg" to="/endorse">I'm a KOL, claim with X</Button></div>
        </Panel>
      ) : (
        <Panel strong className="mt-6 p-5 md:p-6 flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[13px] text-text-secondary">Connected</div><a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="font-mono text-[16px] hover:underline">{short(address)}</a></div>
          <div className="flex gap-2"><Button variant="glass" size="sm" to="/endorse">I'm a KOL, claim with X</Button><ConnectButton size="sm" /></div>
        </Panel>
      )}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Stat label="Launched" value={mine.length} />
        <Stat label="Earned as launcher" value={<span className="text-green">{fmtEth(earnedLauncher)}</span>} sub={<span className="text-text-secondary">about {fmtUsd(earnedLauncher * 2500)}</span>} />
        <Stat label="Earned as KOL" value={<span className="text-green">{fmtEth(earnedKol)}</span>} />
        <Stat label="Coins in your name" value={asKol.length} />
      </div>

      <div className="mt-6">
        <h2 className="text-[18px] mb-2.5">Watching</h2>
        {watchedKols.length + watchedCoins.length === 0 ? (
          <Empty title="Nothing on your watchlist" body="Star a KOL or a coin and it shows up here." action={<Button to="/kols" size="sm" variant="glass">Browse KOLs</Button>} />
        ) : (
          <Panel className="overflow-hidden">
            {watchedKols.map((k, i) => (
              <Link key={'k' + k.handle} to={`/kol/${k.handle}`} className={`row-hover flex items-center gap-3 px-4 h-14 ${i ? 'hair' : ''}`}>
                <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={36} />
                <div className="flex-1 min-w-0 font-bold truncate">{k.name} <span className="text-text-secondary font-medium">@{k.handle}</span></div>
                <span className="text-[12px] text-text-secondary">{coins.filter((c) => c.kolRef.toLowerCase() === k.handle.toLowerCase()).length} coins</span>
              </Link>
            ))}
            {watchedCoins.map((c, i) => (
              <Link key={'c' + c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-14 ${i + watchedKols.length ? 'hair' : ''}`}>
                <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={c.logo} size={36} />
                <div className="flex-1 min-w-0 font-bold truncate">${c.symbol} <span className="text-text-secondary font-medium">for @{c.kolRef}</span></div>
                <span className="text-green font-bold tabular text-[13px]">+{fmtEth(c.toKolEth)}</span>
              </Link>
            ))}
          </Panel>
        )}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="text-[18px] mb-2.5">Your launches</h2>
          {mine.length === 0 ? (
            <Empty title="Nothing launched yet" body="Pick a KOL and launch. You earn 0.5% of every trade on that coin." action={<Button to="/launch" size="sm">Launch a coin</Button>} />
          ) : (
            <Panel className="overflow-hidden">
              {mine.map((c, i) => {
                const k = kols.find((x) => x.handle.toLowerCase() === c.kolRef.toLowerCase())
                return (
                  <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-16 ${i ? 'hair' : ''}`}>
                    <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={c.logo ?? k?.avatar} size={40} />
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 font-bold">${c.symbol}{c.endorsed && <Verified />}</div><div className="text-[13px] text-text-secondary truncate">for {c.kind === 'KOL' ? '@' : ''}{c.kolRef}, {c.launchedAt ? `${ago(c.launchedAt)} ago` : ''}</div></div>
                    <div className="text-right"><div className="font-bold tabular text-green">+{fmtEth(c.feesEth * 0.1563)}</div><div className="text-[12px] text-text-secondary">your 0.5%</div></div>
                  </Link>
                )
              })}
            </Panel>
          )}
        </div>
        <div>
          <h2 className="text-[18px] mb-2.5">Coins in your name</h2>
          {asKol.length === 0 ? (
            <Empty title="None yet" body="If your FOMO wallet is this address, coins launched for you show up here with what they've paid you." />
          ) : (
            <Panel className="overflow-hidden">
              {asKol.map((c, i) => (
                <Link key={c.address} to={`/coin/${c.address}`} className={`row-hover flex items-center gap-3 px-4 h-16 ${i ? 'hair' : ''}`}>
                  <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={c.logo} size={40} />
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 font-bold">${c.symbol}{c.endorsed ? <Tag tone="primary">Endorsed</Tag> : <Tag tone="muted">Not endorsed</Tag>}</div><div className="text-[13px] text-text-secondary truncate">{c.buyers} buyers</div></div>
                  <div className="font-bold tabular text-green">+{fmtEth(c.toKolEth / Math.max(1, c.kolAccounts.length))}</div>
                </Link>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
