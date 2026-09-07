import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { robinhoodChain, explorerAddress } from '../lib/chain'
import { Button } from './ui'

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/** Header button: connects an injected wallet, shows the address, offers switch/disconnect. */
export function ConnectButton({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const { data: bal } = useBalance({ address, chainId: robinhoodChain.id, query: { enabled: !!address } })

  if (!isConnected || !address) {
    const c = connectors[0]
    return (
      <div className="relative">
        <Button variant="primary" size={size} onClick={() => c && connect({ connector: c })} disabled={isPending || !c}>
          {isPending ? 'Connecting' : 'Connect'}
        </Button>
        {error && <div className="absolute right-0 mt-2 w-64 panel rounded-xl p-3 text-[13px] text-red">{error.message.split('\n')[0]}</div>}
        {!c && <div className="absolute right-0 mt-2 w-64 panel rounded-xl p-3 text-[13px] text-text-secondary">No wallet found. Install MetaMask, Rabby or Coinbase Wallet.</div>}
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
