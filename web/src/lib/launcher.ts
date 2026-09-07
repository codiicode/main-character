import type { Abi, Hex } from 'viem'
import { decodeEventLog, parseEther } from 'viem'
import launcherAbiJson from './abi/MainLauncher.json'
import splitterAbiJson from './abi/MainSplitter.json'

export const launcherAbi = launcherAbiJson as Abi
export const splitterAbi = splitterAbiJson as Abi

export const ponsFactoryAbi = [
  {
    type: 'function',
    name: 'previewLaunchEconomics',
    stateMutability: 'view',
    inputs: [
      { name: 'launchConfigId', type: 'uint256' },
      { name: 'pairToken', type: 'address' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'launchFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi

export type LaunchKind = 'KOL' | 'CLAN'

export type LaunchArgs = {
  name: string
  symbol: string
  logo: string
  description: string
  twitter: string
  website: string
  expectedEconomics: Hex
  salt: Hex
  kind: LaunchKind
  kolRef: string
  kolAccounts: `0x${string}`[]
  kolWeights: bigint[]
  minTokensOut: bigint
}

export function randomSalt(): Hex {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return ('0x' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('')) as Hex
}

const ZERO = '0x0000000000000000000000000000000000000000' as const

/** Tuple in the exact order of MainLauncher.LaunchInput. */
export function toLaunchInput(a: LaunchArgs) {
  return {
    name: a.name,
    symbol: a.symbol,
    logo: a.logo,
    description: a.description,
    socials: { twitter: a.twitter, telegram: '', discord: '', website: a.website, farcaster: '' },
    expectedEconomics: a.expectedEconomics,
    salt: a.salt,
    kind: a.kind === 'KOL' ? 0 : 1,
    kolRef: a.kolRef,
    kolAccounts: a.kolAccounts.map((x) => x || ZERO),
    kolWeights: a.kolWeights,
    minTokensOut: a.minTokensOut,
  }
}

export const devBuyToWei = (eth: string) => {
  const n = Number(eth)
  if (!eth || !isFinite(n) || n <= 0) return 0n
  return parseEther(eth as `${number}`)
}

export type CoinLaunchedEvent = {
  token: `0x${string}`
  curve: `0x${string}`
  splitter: `0x${string}`
  launcher: `0x${string}`
  kind: number
  kolRef: string
  kolAccounts: `0x${string}`[]
  devBuyWei: bigint
}

export function parseCoinLaunched(logs: { data: Hex; topics: Hex[]; address: string }[], launcherAddress: string): CoinLaunchedEvent | null {
  for (const l of logs) {
    if (l.address.toLowerCase() !== launcherAddress.toLowerCase()) continue
    try {
      const ev = decodeEventLog({ abi: launcherAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] })
      if (ev.eventName === 'CoinLaunched') return ev.args as unknown as CoinLaunchedEvent
    } catch {
      /* not ours */
    }
  }
  return null
}
