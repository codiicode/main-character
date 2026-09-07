import { defineChain } from 'viem'
import { createConfig, http } from 'wagmi'
import { injected, mock } from 'wagmi/connectors'

const RPC = (import.meta.env.VITE_RPC as string | undefined) || 'https://rpc.mainnet.chain.robinhood.com'

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
})

// Dev only: a fake wallet backed by anvil's unlocked accounts, so the launch flow can be exercised
// in a browser without an extension. Never set VITE_DEV_MOCK_WALLET in production.
const devMock = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_WALLET
const connectors = devMock
  ? [mock({ accounts: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'], features: { reconnect: true } })]
  : [injected()]

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors,
  transports: { [robinhoodChain.id]: http(RPC) },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

/** Set after deploying contracts/script/Deploy.s.sol. Empty = launch UI shows "not deployed yet". */
export const MAIN_LAUNCHER_ADDRESS = (import.meta.env.VITE_MAIN_LAUNCHER as `0x${string}` | undefined) || undefined
/** Block the launcher was deployed at; the coin indexer scans logs from here. */
export const MAIN_START_BLOCK = BigInt((import.meta.env.VITE_MAIN_START_BLOCK as string | undefined) || '0')
export const PONS_FACTORY_ADDRESS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as const
export const explorerAddress = (a: string) => `https://robinhoodchain.blockscout.com/address/${a}`
export const explorerTx = (h: string) => `https://robinhoodchain.blockscout.com/tx/${h}`
