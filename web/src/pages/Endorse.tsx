import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useKols, hueFor } from '../data/kols'
import { useCoins, fmtEth } from '../data/coins'
import { Avatar, Button, Panel, Tag, Verified, Empty } from '../components/ui'

type Session = { x: string | null; name?: string | null; configured: boolean }

export default function Endorse() {
  const { address } = useParams()
  const { coins, loading, refresh } = useCoins()
  const { kols } = useKols()
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<{ s: 'idle' | 'busy' | 'done' | 'error'; msg?: string; hash?: string }>({ s: 'idle' })

  useEffect(() => {
    fetch('/api/session').then((r) => r.json()).then(setSession).catch(() => setSession({ x: null, configured: false }))
  }, [])

  const coin = address ? coins.find((c) => c.address.toLowerCase() === address.toLowerCase()) : undefined
  const mine = session?.x ? coins.filter((c) => c.kind === 'KOL' && c.kolRef.toLowerCase() === session.x!.toLowerCase()) : []
  const k = coin ? kols.find((x) => x.handle.toLowerCase() === coin.kolRef.toLowerCase()) : undefined
  const next = address ? `/endorse/${address}` : '/endorse'

  async function endorse(token: string) {
    setState({ s: 'busy' })
    const r = await fetch('/api/endorse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
    const j = (await r.json()) as { ok?: boolean; hash?: string; error?: string }
    if (r.ok && j.ok) { setState({ s: 'done', hash: j.hash }); await refresh() }
    else setState({ s: 'error', msg: j.error ?? 'Something went wrong.' })
  }

  async function logout() {
    await fetch('/api/session', { method: 'DELETE' })
    setSession({ x: null, configured: true })
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <Link to={coin ? `/coin/${coin.address}` : '/'} className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[15px] mb-4"><ArrowLeft size={16} /> Back</Link>
      <h1 className="text-[34px] md:text-[44px] leading-none">Endorse</h1>
      <p className="text-text-secondary mt-2 text-[15px] max-w-[56ch]">Prove you're the main character. Your coin gets the verified badge and traders know the fees really reach you. Log in with the X account that matches your FOMO handle.</p>

      {coin && (
        <Panel strong className="mt-6 p-5 flex items-center gap-4">
          <Avatar name={coin.symbol} hue={hueFor(coin.kolRef)} src={coin.logo ?? k?.avatar} large size={64} glow />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-bold text-[20px]">${coin.symbol} {coin.endorsed && <Verified />}</div>
            <div className="text-text-secondary text-[14px]">for @{coin.kolRef}, {fmtEth(coin.toKolEth)} paid so far</div>
          </div>
          {coin.endorsed ? <Tag tone="primary">Endorsed</Tag> : <Tag tone="muted">Not endorsed</Tag>}
        </Panel>
      )}
      {address && !loading && !coin && <div className="mt-6"><Empty title="Coin not found" body="This address isn't a MAIN coin." /></div>}

      <Panel className="mt-5 p-5">
        {session === null && <div className="text-text-secondary">Checking your session</div>}
        {session && !session.configured && <div className="text-warning text-[14px]">X login isn't connected on this deployment yet. It goes live once the X app keys are added.</div>}
        {session && session.configured && !session.x && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex-1 text-[15px]">Log in with X to continue.</span>
            <Button href={`/api/x/login?next=${encodeURIComponent(next)}`}>Log in with X</Button>
          </div>
        )}
        {session?.x && (
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[15px]">Logged in as <b>@{session.x}</b>{session.name ? `, ${session.name}` : ''}</span>
              <button onClick={logout} className="text-[13px] text-text-secondary hover:text-text-primary underline underline-offset-4">Log out</button>
            </div>

            {coin && !coin.endorsed && coin.kind === 'KOL' && (
              <div className="mt-4">
                <Button size="lg" className="w-full" onClick={() => endorse(coin.address)} disabled={state.s === 'busy'}>
                  {state.s === 'busy' ? 'Endorsing on-chain' : `Endorse $${coin.symbol} as @${session.x}`}
                </Button>
                {state.s === 'error' && <p className="text-red text-[13px] mt-2">{state.msg}</p>}
              </div>
            )}
            {coin && coin.kind === 'CLAN' && <p className="text-text-secondary text-[14px] mt-4">Clan coins can't be endorsed yet.</p>}
            {state.s === 'done' && <p className="text-green text-[14px] mt-3">Endorsed. Your coin now carries the verified badge.</p>}

            {!coin && (
              <div className="mt-5">
                <div className="text-[13px] text-text-secondary mb-2">Coins launched for @{session.x}</div>
                {mine.length === 0 ? (
                  <Empty title="No coin in your name yet" body="When someone launches for you, it shows up here and you can endorse it." />
                ) : (
                  <div className="grid gap-2">
                    {mine.map((c) => (
                      <div key={c.address} className="well rounded-2xl p-3 flex items-center gap-3">
                        <Avatar name={c.symbol} hue={hueFor(c.kolRef)} src={c.logo} size={40} />
                        <div className="flex-1 min-w-0"><div className="font-bold">${c.symbol}</div><div className="text-[13px] text-text-secondary">{fmtEth(c.toKolEth)} paid to you</div></div>
                        {c.endorsed ? <Tag tone="primary">Endorsed</Tag> : <Button size="sm" onClick={() => endorse(c.address)} disabled={state.s === 'busy'}>Endorse</Button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      <p className="text-text-tertiary text-[13px] mt-4">Your X handle must match your FOMO handle, or be listed as the X account on your FOMO profile. We only read your username, nothing is posted.</p>
    </div>
  )
}
