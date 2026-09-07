import { defineChain } from 'viem'
import { createConfig, http, type CreateConnectorFn } from 'wagmi'
import { injected, mock, walletConnect } from 'wagmi/connectors'

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
/** Reown (WalletConnect) project id. Free at cloud.reown.com. Without it only injected wallets are offered. */
export const WC_PROJECT_ID = (import.meta.env.VITE_WC_PROJECT_ID as string | undefined) || ''

const connectors: CreateConnectorFn[] = devMock
  ? [mock({ accounts: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'], features: { reconnect: true } })]
  : [
      injected({ shimDisconnect: true }),
      ...(WC_PROJECT_ID
        ? [
            walletConnect({
              projectId: WC_PROJECT_ID,
              showQrModal: true,
              metadata: { name: 'MAIN', description: 'Every trader is a main character.', url: 'https://main-character-c38.pages.dev', icons: ['https://main-character-c38.pages.dev/brand/logo-512.png'] },
            }),
          ]
        : []),
    ]

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
/** Cloudflare Turnstile site key for free launches. The "1x…AA" test key always passes; replace in production. */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '1x00000000000000000000AA'
export const PONS_FACTORY_ADDRESS = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as const
export const explorerAddress = (a: string) => `https://robinhoodchain.blockscout.com/address/${a}`
export const explorerTx = (h: string) => `https://robinhoodchain.blockscout.com/tx/${h}`
