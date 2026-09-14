import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAccount, usePublicClient, useWriteContract, useSwitchChain } from 'wagmi'
import { formatEther } from 'viem'
import { useCoins, isEndorsedRef } from '../data/coins'
import { useAllKols, resolveKol, hueFor, shortAddr, type Kol } from '../data/kols'
import { Avatar, Button, Pnl, Tag, Verified, Panel } from '../components/ui'
import { ConnectButton } from '../components/Connect'
import { Turnstile } from '../components/Turnstile'
import { resizeImage, uploadImage } from '../lib/image'
import { MAIN_LAUNCHER_ADDRESS, PONS_FACTORY_ADDRESS, robinhoodChain, explorerTx } from '../lib/chain'
import { launcherAbi, ponsFactoryAbi, toLaunchInput, randomSalt, devBuyToWei, parseCoinLaunched } from '../lib/launcher'
import { largeAvatar } from '../components/ui'

const field = 'well w-full h-12 rounded-xl focus:border-primary/60 outline-none px-4 text-[16px] placeholder:text-text-tertiary transition-colors'

type Mode = 'KOL' | 'CLAN'
type TxState = { step: 'idle' } | { step: 'preparing' } | { step: 'signing' } | { step: 'mining'; hash: `0x${string}` } | { step: 'done'; hash: `0x${string}`; token: `0x${string}` } | { step: 'error'; msg: string }

export default function Launch() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { kols, loading } = useAllKols()
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: robinhoodChain.id })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const { coins } = useCoins()
  const isEndorsed = (h: string) => isEndorsedRef(coins, h)

  const [mode, setMode] = useState<Mode>(params.get('clan') ? 'CLAN' : 'KOL')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(params.get('kol'))
  const [clan, setClan] = useState<string | null>(params.get('clan'))
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'none' | 'error'; msg?: string; candidates?: string[] }>({ state: 'idle' })
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [desc, setDesc] = useState('')
  const [twitter, setTwitter] = useState('')
  const [website, setWebsite] = useState('')
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoErr, setLogoErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)
  const [devBuy, setDevBuy] = useState('0')
  const [tx, setTx] = useState<TxState>({ step: 'idle' })
  // Free mode: MAIN's relayer pays the fee and gas; no wallet needed.
  const [free, setFree] = useState(true)
  const [payout, setPayout] = useState('')
  const [tsToken, setTsToken] = useState('')
  const [freeTx, setFreeTx] = useState<{ s: 'idle' | 'busy' | 'done' | 'error'; msg?: string; token?: string }>({ s: 'idle' })
  const [launchFee, setLaunchFee] = useState<bigint | null>(null)

  // Clans derived from the leaderboard snapshot: members with a resolved wallet share the KOL pool.
  const clans = useMemo(() => {
    const m = new Map<string, Kol[]>()
    for (const k of kols) if (k.clan) m.set(k.clan, [...(m.get(k.clan) ?? []), k])
    return [...m.entries()].map(([name, members]) => ({ name, members, funded: members.filter((x) => x.wallets.evm) })).sort((a, b) => b.members.length - a.members.length)
  }, [kols])

  const list = useMemo(() => {
    const s = q.trim().replace(/^@/, '').toLowerCase()
    const base = s ? kols.filter((k) => (k.handle + ' ' + k.name).toLowerCase().includes(s)) : kols
    return base.slice(0, 60)
  }, [q, kols])
  const clanList = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? clans.filter((c) => c.name.toLowerCase().includes(s)) : clans
  }, [q, clans])

  const kol: Kol | undefined = kols.find((k) => k.handle.toLowerCase() === sel?.toLowerCase())
  const clanSel = clans.find((c) => c.name === clan)
  // A KOL without a resolved wallet can still be launched for: the splitter holds their share until MAIN sets the address.
  const targetReady = mode === 'KOL' ? !!kol : !!clanSel && clanSel.funded.length > 0
  const pendingWallet = mode === 'KOL' && !!kol && !kol.wallets.evm
  const canLaunch = targetReady && name.trim().length > 1 && symbol.trim().length > 1 && !!MAIN_LAUNCHER_ADDRESS
  const payoutOk = !payout.trim() || /^0x[0-9a-fA-F]{40}$/.test(payout.trim())
  const canFree = targetReady && name.trim().length > 1 && symbol.trim().length > 1 && payoutOk && !!tsToken

  useEffect(() => {
    const h = params.get('kol')
    if (h && !loading && !kols.some((k) => k.handle.toLowerCase() === h.toLowerCase())) void doLookup(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  useEffect(() => {
    if (!publicClient) return
    publicClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: 'launchFee' }).then(setLaunchFee).catch(() => {})
  }, [publicClient])

  async function pickImage(file: File | undefined) {
    if (!file) return
    setLogoErr('')
    try {
      const blob = await resizeImage(file)
      setLogoBlob(blob)
      setLogoPreview(URL.createObjectURL(blob))
    } catch (e) {
      setLogoErr(e instanceof Error ? e.message : 'Could not read that image')
    }
  }
  function resetImage() {
    setLogoBlob(null)
    setLogoPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }
  /** On phones the picker sits above the form; jump to the form once a target is chosen. */
  function focusDetails() {
    if (window.innerWidth < 768) setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  async function resolvedLogo(fallback: string | null | undefined): Promise<string> {
    if (logoBlob) return uploadImage(logoBlob)
    return fallback ?? ''
  }

  async function doLookup(handle: string) {
    setLookup({ state: 'busy' })
    const r = await resolveKol(handle)
    if (r.kol) { setSel(r.kol.handle); setQ(''); setLookup({ state: 'idle' }); focusDetails() }
    else if (r.error) setLookup({ state: 'error', msg: r.error })
    else setLookup({ state: 'none', candidates: r.candidates })
  }

  async function launch() {
    if (!publicClient || !MAIN_LAUNCHER_ADDRESS || !address) return
    try {
      if (chainId !== robinhoodChain.id) await switchChainAsync({ chainId: robinhoodChain.id })
      setTx({ step: 'preparing' })
      const [fee, econ] = await Promise.all([
        publicClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: 'launchFee' }),
        publicClient.readContract({ address: PONS_FACTORY_ADDRESS, abi: ponsFactoryAbi, functionName: 'previewLaunchEconomics', args: [0n, '0x0000000000000000000000000000000000000000'] }),
      ])
      const kolAccounts = mode === 'KOL' ? [(kol!.wallets.evm || '0x0000000000000000000000000000000000000000') as `0x${string}`] : clanSel!.funded.map((m) => m.wallets.evm as `0x${string}`)
      const kolWeights = kolAccounts.map(() => 1n)
      const logo = await resolvedLogo(mode === 'KOL' ? largeAvatar(kol!.avatar) : '')
      const input = toLaunchInput({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        logo,
        description: desc.trim() || (mode === 'KOL' ? `A coin for @${kol!.handle} on MAIN. 1% of every trade goes to them.` : `A coin for the ${clanSel!.name} clan on MAIN. Members share 1% of every trade.`),
        twitter: twitter.trim(),
        website: website.trim(),
        expectedEconomics: econ,
        salt: randomSalt(),
        kind: mode,
        kolRef: mode === 'KOL' ? kol!.handle : clanSel!.name,
        kolAccounts,
        kolWeights,
        minTokensOut: 0n,
      })
      setTx({ step: 'signing' })
      const hash = await writeContractAsync({
        address: MAIN_LAUNCHER_ADDRESS,
        abi: launcherAbi,
        functionName: 'launch',
        args: [input],
        value: fee + devBuyToWei(devBuy),
        chainId: robinhoodChain.id,
      })
      setTx({ step: 'mining', hash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('Transaction reverted')
      const ev = parseCoinLaunched(receipt.logs, MAIN_LAUNCHER_ADDRESS)
      if (!ev) throw new Error('Launched, but could not read the coin address from the receipt')
      setTx({ step: 'done', hash, token: ev.token })
      setTimeout(() => nav(`/coin/${ev.token}`), 1200)
    } catch (e) {
      const msg = e instanceof Error ? e.message.split('\n')[0] : String(e)
      setTx({ step: 'error', msg: /user rejected|denied/i.test(msg) ? 'You cancelled in your wallet.' : msg })
    }
  }

  async function launchFree() {
    setFreeTx({ s: 'busy' })
    try {
      const logo = await resolvedLogo(mode === 'KOL' ? largeAvatar(kol?.avatar) : '')
      const r = await fetch('/api/free-launch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          handle: mode === 'KOL' ? kol?.handle : undefined,
          clan: mode === 'CLAN' ? clanSel?.name : undefined,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: desc.trim(),
          logo,
          twitter: twitter.trim(),
          website: website.trim(),
          payout: payout.trim(),
          turnstile: tsToken,
        }),
      })
      const j = (await r.json()) as { ok?: boolean; token?: string; error?: string }
      if (!r.ok || !j.ok) { setFreeTx({ s: 'error', msg: j.error ?? 'Launch failed.' }); return }
      setFreeTx({ s: 'done', token: j.token })
      if (j.token) setTimeout(() => nav(`/coin/${j.token}`), 1200)
    } catch {
      setFreeTx({ s: 'error', msg: 'Could not reach MAIN. Check your connection.' })
    }
  }

  const typed = q.trim().replace(/^@/, '')
  const exact = kols.some((k) => k.handle.toLowerCase() === typed.toLowerCase())
  const canLookup = mode === 'KOL' && typed.length >= 2 && !exact
  const busy = tx.step === 'preparing' || tx.step === 'signing' || tx.step === 'mining'

  return (
    <div className="max-w-[1080px] mx-auto">
      <h1 className="text-[34px] md:text-[44px] leading-none">Launch a coin</h1>
      <p className="text-text-secondary mt-2 text-[16px] max-w-[56ch]">Pick the main character. Fees go to their FOMO wallet from the first trade, and you keep 0.5% of every trade, forever.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[380px_1fr]">
        {/* Choose target */}
        <Panel className="p-4 flex flex-col md:sticky md:top-[96px] md:h-[calc(100dvh-128px)] md:min-h-[520px]">
          <div className="well rounded-full p-1 grid grid-cols-2 gap-1 mb-3">
            {(['KOL', 'CLAN'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setQ('') }} className={`h-9 rounded-full text-[14px] font-bold transition-all ${mode === m ? 'glass' : 'text-text-secondary'}`}>{m === 'KOL' ? 'One trader' : 'A clan'}</button>
            ))}
          </div>
          <form className="well h-11 rounded-xl flex items-center gap-2 px-3" onSubmit={(e) => { e.preventDefault(); if (canLookup && lookup.state === 'idle') void doLookup(typed) }}>
            <Search size={16} className="text-text-secondary" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLookup({ state: 'idle' }) }} placeholder={mode === 'KOL' ? 'Type any FOMO handle' : 'Search clans'} className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-text-tertiary" />
          </form>
          <div className="mt-2 flex-1 min-h-[360px] md:min-h-0 overflow-y-auto scroll-thin -mx-1 pl-1 pr-2">
            {loading && <div className="p-4 text-text-secondary text-[14px]">Loading traders</div>}
            {mode === 'KOL' && list.map((k) => {
              const active = sel?.toLowerCase() === k.handle.toLowerCase()
              return (
                <button key={k.handle} onClick={() => { setSel(k.handle); focusDetails() }} className={`w-full flex items-center gap-3 px-2 h-16 rounded-2xl text-left transition-all ${active ? 'glass' : 'hover:bg-white/5'}`}>
                  <Avatar name={k.name} hue={hueFor(k.handle)} src={k.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold truncate"><span className="truncate">{k.name}</span> {isEndorsed(k.handle) && <Verified />}</div>
                    <div className="text-[13px] text-text-secondary truncate">@{k.handle}{k.wallets.evm ? '' : ', wallet pending'}</div>
                  </div>
                  <Pnl value={k.pnl['7d'] ?? k.pnl['24h'] ?? 0} compact className="text-[14px]" />
                </button>
              )
            })}
            {mode === 'CLAN' && clanList.map((c) => {
              const active = clan === c.name
              return (
                <button key={c.name} onClick={() => { setClan(c.name); focusDetails() }} className={`w-full flex items-center gap-3 px-2 h-16 rounded-2xl text-left transition-all ${active ? 'glass' : 'hover:bg-white/5'}`}>
                  <div className="flex -space-x-2.5 shrink-0">
                    {c.members.slice(0, 3).map((m) => <Avatar key={m.handle} name={m.name} hue={hueFor(m.handle)} src={m.avatar} size={32} className="ring-2 ring-[#0b0a16]" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{c.name}</div>
                    <div className="text-[13px] text-text-secondary truncate">{c.members.length} on the leaderboard, {c.funded.length} with wallets</div>
                  </div>
                </button>
              )
            })}
            {!loading && canLookup && (
              <div className="p-4 text-center text-[14px] text-text-secondary">
                {lookup.state === 'busy' && <div>Looking up @{typed} on FOMO</div>}
                {lookup.state === 'idle' && (<><div>{list.length ? "Not who you're looking for? Any FOMO trader works." : `@${typed} isn't on the leaderboard.`}</div><Button size="sm" variant="glass" className="mt-3" onClick={() => doLookup(typed)}>Look up @{typed} on FOMO</Button></>)}
                {lookup.state === 'none' && (<><div>No FOMO trader called @{typed}.</div>{lookup.candidates && lookup.candidates.length > 0 && <div className="mt-2 flex flex-wrap justify-center gap-1.5">{lookup.candidates.map((c) => <button key={c} onClick={() => doLookup(c)} className="glass rounded-full px-3 h-8 text-[13px] font-semibold">@{c}</button>)}</div>}</>)}
                {lookup.state === 'error' && <div className="text-red">{lookup.msg}</div>}
              </div>
            )}
          </div>
        </Panel>

        <section className="grid gap-5 content-start">
          <div ref={detailsRef} className="scroll-mt-24" />
          <Panel className="p-4 md:p-5">
            <div className="font-bold text-[16px] mb-3">Coin details</div>
            {mode === 'KOL' && kol && (
              <div className="mb-4 well rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={kol.name} hue={hueFor(kol.handle)} src={kol.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">Paired with {kol.name} <span className="text-text-secondary font-medium">@{kol.handle}</span></div>
                  <div className="text-[13px] mt-1">{kol.wallets.evm ? <Tag tone="green">{shortAddr(kol.wallets.evm)} on Robinhood Chain</Tag> : <Tag tone="yellow">No wallet on FOMO yet, fees will be held for them</Tag>}</div>
                </div>
              </div>
            )}
            {mode === 'CLAN' && clanSel && (
              <div className="mb-4 well rounded-2xl p-3">
                <div className="font-bold">Paired with the {clanSel.name} clan</div>
                <div className="text-[13px] text-text-secondary mt-0.5">{clanSel.funded.length} members split the KOL share equally. Members without a wallet yet are added when it resolves.</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clanSel.members.map((m) => (
                    <span key={m.handle} className={`inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-2 h-7 text-[12px] font-semibold ${m.wallets.evm ? 'glass' : 'bg-white/5 text-text-tertiary'}`}>
                      <Avatar name={m.name} hue={hueFor(m.handle)} src={m.avatar} size={22} /> @{m.handle}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-[1fr_140px] gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Coin name" className={field} />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="TICKER" className={`${field} uppercase`} />
            </div>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={3} className={`${field} h-auto py-3 mt-3 resize-none`} />
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <div className="well rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={symbol || 'coin'} hue={mode === 'KOL' && kol ? hueFor(kol.handle) : 200} src={logoPreview || (mode === 'KOL' ? kol?.avatar : clanSel?.members[0]?.avatar)} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">Coin image</div>
                  <div className="text-[12px] text-text-secondary">{logoBlob ? 'Your image, resized to 512px.' : mode === 'KOL' ? "The KOL's FOMO photo, unless you pick your own." : 'Pick an image for the clan coin.'}</div>
                  {logoErr && <div className="text-[12px] text-red mt-0.5">{logoErr}</div>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button type="button" onClick={() => fileRef.current?.click()} className="glass rounded-xl h-9 px-3 text-[13px] font-bold">{logoBlob ? 'Change' : 'Upload'}</button>
                  {logoBlob && <button type="button" onClick={resetImage} className="text-[12px] text-text-secondary hover:text-text-primary">Use KOL photo</button>}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
              </div>
              <div className="grid gap-3">
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="X link (optional)" className={field} />
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (optional)" className={field} />
              </div>
            </div>
          </Panel>

          <Panel strong className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="font-bold text-[16px]">Review and launch</div>
              <div className="well rounded-full p-1 flex gap-1">
                <button onClick={() => setFree(true)} className={`h-8 px-3.5 rounded-full text-[13px] font-bold transition-all ${free ? 'glass' : 'text-text-secondary'}`}>Free, no wallet</button>
                <button onClick={() => setFree(false)} className={`h-8 px-3.5 rounded-full text-[13px] font-bold transition-all ${!free ? 'glass' : 'text-text-secondary'}`}>With my wallet</button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="well rounded-2xl p-3.5">
                <div className="text-[13px] text-text-secondary mb-2">On every trade</div>
                <div className="h-3 rounded-full overflow-hidden flex bg-black/40 p-[2px] gap-[2px]"><div className="rounded-full bg-green" style={{ width: '66.6%' }} /><div className="rounded-full bg-warning flex-1" /></div>
                <div className="mt-2.5 grid grid-cols-2 text-[13px]">
                  <div><span className="text-green font-bold text-[15px]">1%</span><br />{mode === 'KOL' ? 'to the KOL' : 'shared by the clan'}</div>
                  <div><span className="text-warning font-bold text-[15px]">0.5%</span><br />to you</div>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2.5">Another 0.5% buys and burns $MAIN. Your 0.5% is locked in for the life of the coin.</div>
              </div>
              {free ? (
                <div className="well rounded-2xl p-3.5">
                  <div className="text-[13px] text-text-secondary mb-2">Where your 0.5% goes (optional)</div>
                  <input value={payout} onChange={(e) => setPayout(e.target.value.trim())} placeholder="0x… address on Robinhood Chain" className={`glass w-full h-11 rounded-xl px-4 text-[14px] font-mono outline-none ${payout && !payoutOk ? 'ring-1 ring-red' : ''}`} />
                  <div className="text-[12px] text-text-tertiary mt-2.5">MAIN pays the launch fee and gas. Leave this empty and your launcher share goes to MAIN. No first buy in free mode.</div>
                </div>
              ) : (
              <div className="well rounded-2xl p-3.5">
                <div className="text-[13px] text-text-secondary mb-2">Buy at launch (optional)</div>
                <div className="flex items-center gap-2">
                  <input value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" className="glass w-full h-11 rounded-xl px-4 text-[16px] outline-none tabular" />
                  <span className="font-bold">ETH</span>
                </div>
                <div className="text-[12px] text-text-tertiary mt-2.5">Launch fee {launchFee != null ? formatEther(launchFee) : '0.0005'} ETH plus gas. Your first buy skips the launch-window snipe tax. 1B supply, liquidity locked on Pons V2.</div>
              </div>
              )}
            </div>

            {pendingWallet && <div className="mt-4 well rounded-2xl p-3 text-[13px] text-warning">FOMO hasn't given @{kol!.handle} an EVM wallet yet. You can launch anyway: their 1% is held in the coin's fee splitter and released to their wallet as soon as FOMO creates one.</div>}
            {!MAIN_LAUNCHER_ADDRESS && <div className="mt-4 well rounded-2xl p-3 text-[13px] text-warning">Launch contract isn't deployed yet. Everything else works; this button goes live after deployment.</div>}

            {free ? (
              <div className="mt-4">
                <Turnstile onToken={setTsToken} />
                <Button variant="primary" size="lg" className="w-full mt-2" disabled={!canFree || freeTx.s === 'busy' || !MAIN_LAUNCHER_ADDRESS} onClick={launchFree}>
                  {freeTx.s === 'busy' ? 'Launching on Pons, MAIN pays' : freeTx.s === 'done' ? 'Launched' : `Launch ${symbol ? '$' + symbol : 'coin'} for free`}
                </Button>
                {freeTx.s === 'idle' && !canFree && <p className="text-text-tertiary text-[12px] text-center mt-2">{!targetReady ? (mode === 'KOL' ? 'Pick a KOL to continue' : 'Pick a clan with wallets') : name.trim().length < 2 || symbol.trim().length < 2 ? 'Add a name and ticker' : !payoutOk ? 'That payout address is not valid' : 'Waiting for the human check'}</p>}
                {freeTx.s === 'done' && <p className="text-green text-[13px] text-center mt-2">Live. Taking you to the coin page.</p>}
                {freeTx.s === 'error' && <p className="text-red text-[13px] text-center mt-2">{freeTx.msg} <button className="underline" onClick={() => setFreeTx({ s: 'idle' })}>Try again</button></p>}
              </div>
            ) : (
            <div className="mt-4">
              {!isConnected ? (
                <div className="flex flex-col sm:flex-row items-center gap-3"><ConnectButton size="lg" /><span className="text-[13px] text-text-secondary">Connect a wallet with a little ETH on Robinhood Chain to launch.</span></div>
              ) : (
                <Button variant="primary" size="lg" className="w-full" disabled={!canLaunch || busy} onClick={launch}>
                  {tx.step === 'preparing' ? 'Preparing' : tx.step === 'signing' ? 'Confirm in your wallet' : tx.step === 'mining' ? 'Launching on Pons' : tx.step === 'done' ? 'Launched' : `Launch ${symbol ? '$' + symbol : 'coin'}`}
                </Button>
              )}
              {isConnected && !canLaunch && tx.step === 'idle' && (
                <p className="text-text-tertiary text-[12px] text-center mt-2">{mode === 'KOL' ? (!kol ? 'Pick a KOL to continue' : 'Add a name and ticker') : (!clanSel ? 'Pick a clan to continue' : clanSel.funded.length === 0 ? 'No member of this clan has a wallet yet' : 'Add a name and ticker')}</p>
              )}
              {tx.step === 'mining' && <p className="text-text-secondary text-[13px] text-center mt-2">Waiting for Robinhood Chain. <a className="underline" href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">View transaction</a></p>}
              {tx.step === 'done' && <p className="text-green text-[13px] text-center mt-2">Live. Taking you to the coin page.</p>}
              {tx.step === 'error' && <p className="text-red text-[13px] text-center mt-2">{tx.msg} <button className="underline" onClick={() => setTx({ step: 'idle' })}>Try again</button></p>}
            </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  )
}
