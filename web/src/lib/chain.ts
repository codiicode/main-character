import { defineChain } from 'viem'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
})

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: { [robinhoodChain.id]: http() },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

/** Set after deploying contracts/script/Deploy.s.sol. Empty = launch UI shows "not deployed yet". */
export const MAIN_LAUNCHER_ADDRESS = (import.meta.env.VITE_MAIN_LAUNCHER as `0x${string}` | undefined) ?? undefined
export const PONS_FACTORY_ADDRESS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as const
export const explorerAddress = (a: string) => `https://robinhoodchain.blockscout.com/address/${a}`
export const explorerTx = (h: string) => `https://robinhoodchain.blockscout.com/tx/${h}`
