import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { robinhoodChain, explorerAddress } from '../lib/chain'
import { Link } from 'react-router-dom'
import { Button } from './ui'

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/** Header button: connects a wallet (extension or WalletConnect), shows the address, offers switch/disconnect. */
export function ConnectButton({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending, error, variables } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const { data: bal } = useBalance({ address, chainId: robinhoodChain.id, query: { enabled: !!address } })

  if (!isConnected || !address) {
    const injectedC = connectors.find((c) => c.type === 'injected' || c.id === 'mock')
    const wc = connectors.find((c) => c.type === 'walletConnect')
    const hasExtension = typeof window !== 'undefined' && !!(window as { ethereum?: unknown }).ethereum
    const canConnect = hasExtension || !!wc || injectedC?.id === 'mock'
    const site = 'maincharacter.family'
    const here = typeof location !== 'undefined' ? location.pathname + location.search : '/'
    void variables
    return (
      <div className="relative">
        <Button variant="primary" size={size} onClick={() => (canConnect && !wc && injectedC ? connect({ connector: injectedC }) : setOpen((o) => !o))} disabled={isPending}>
          {isPending ? 'Connecting' : 'Connect'}
        </Button>
        {open && (
          <div className="absolute right-0 mt-2 w-72 panel panel-strong rounded-2xl p-2 z-50">
            {hasExtension && injectedC && (
              <button onClick={() => { connect({ connector: injectedC }); setOpen(false) }} className="w-full text-left px-3 py-2.5 rounded-xl row-hover text-[14px]">
                <div className="font-bold">Browser wallet</div>
                <div className="text-text-secondary text-[12px]">MetaMask, Rabby, Coinbase Wallet</div>
              </button>
            )}
            {wc && (
              <button onClick={() => { connect({ connector: wc }); setOpen(false) }} className="w-full text-left px-3 py-2.5 rounded-xl row-hover text-[14px]">
                <div className="font-bold">WalletConnect</div>
                <div className="text-text-secondary text-[12px]">Scan with any mobile wallet</div>
              </button>
            )}
            {!canConnect && (
              <div className="px-3 py-2.5 text-[13px]">
                <div className="font-bold">No wallet in this browser</div>
                <div className="text-text-secondary text-[12px] mt-1">Open MAIN inside your wallet app, or launch for free without one.</div>
                <div className="mt-2.5 grid gap-1.5">
                  <a className="glass rounded-xl h-9 px-3 flex items-center text-[13px] font-bold" href={`https://metamask.app.link/dapp/${site}${here}`}>Open in MetaMask</a>
                  <a className="glass rounded-xl h-9 px-3 flex items-center text-[13px] font-bold" href={`https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(`https://${site}${here}`)}`}>Open in Coinbase Wallet</a>
                  <a className="glass rounded-xl h-9 px-3 flex items-center text-[13px] font-bold" href={`https://link.rabby.io/dapp/${site}${here}`}>Open in Rabby</a>
                  <Link to="/launch" onClick={() => setOpen(false)} className="text-[#aab5ff] font-bold text-[13px] px-1 pt-1">Launch for free instead</Link>
                </div>
              </div>
            )}
          </div>
        )}
        {error && !isPending && !open && <div className="absolute right-0 mt-2 w-64 panel rounded-xl p-3 text-[13px] text-red z-50">{error.message.split('\n')[0]}</div>}
      </div>
    )
  }

  const wrongChain = chainId !== robinhoodChain.id
  return (
    <div className="relative">
      <Button variant={wrongChain ? 'primary' : 'glass'} size={size} onClick={() => (wrongChain ? switchChain({ chainId: robinhoodChain.id }) : setOpen((o) => !o))} disabled={switching}>
        {wrongChain ? (switching ? 'Switching' : 'Switch to Robinhood Chain') : (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green" />
            {short(address)}
            {bal && <span className="text-text-secondary font-medium tabular">{Number(formatEther(bal.value)).toFixed(3)} ETH</span>}
          </span>
        )}
      </Button>
      {open && !wrongChain && (
        <div className="absolute right-0 mt-2 w-60 panel panel-strong rounded-2xl p-2 z-50">
          <a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="block px-3 py-2 rounded-xl row-hover text-[14px]">View on Blockscout</a>
          <button onClick={() => navigator.clipboard?.writeText(address)} className="w-full text-left px-3 py-2 rounded-xl row-hover text-[14px]">Copy address</button>
          <button onClick={() => { disconnect(); setOpen(false) }} className="w-full text-left px-3 py-2 rounded-xl row-hover text-[14px] text-red">Disconnect</button>
        </div>
      )}
    </div>
  )
}
