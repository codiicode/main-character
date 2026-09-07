export type Kol = {
  handle: string
  name: string
  pnl24h: number
  pnl7d: number
  pnl30d: number
  pnlAll: number
  followers: number
  trades: number
  wallet: string | null
  hue: number
  endorsed?: boolean
}

export type Coin = {
  address: string
  name: string
  symbol: string
  kol: string
  launcher: string
  mcap: number
  price: number
  change24h: number
  vol24h: number
  holders: number
  feesEth: number
  endorsed: boolean
  createdAt: string
  hue: number
  graduated: boolean
}

export const kols: Kol[] = [
  { handle: 'Proteus', name: 'Proteus', pnl24h: 1178533.25, pnl7d: 2410022, pnl30d: 5120000, pnlAll: 12800000, followers: 41200, trades: 1893, wallet: '0x8a1f…c2d9', hue: 210, endorsed: true },
  { handle: 'econoar', name: 'eric.eth', pnl24h: 1080758.62, pnl7d: 1900500, pnl30d: 4020000, pnlAll: 9700000, followers: 33100, trades: 2210, wallet: '0x41be…77e0', hue: 30 },
  { handle: 'Aurelius0121', name: 'Aurelius', pnl24h: 962302.5, pnl7d: 1500000, pnl30d: 3300000, pnlAll: 8100000, followers: 27800, trades: 1402, wallet: '0x9c02…1a4f', hue: 270, endorsed: true },
  { handle: 'achitaka', name: 'achitaka', pnl24h: 702183.55, pnl7d: 1220000, pnl30d: 2800000, pnlAll: 6400000, followers: 19400, trades: 980, wallet: '0x77d3…09bb', hue: 340 },
  { handle: 'Albus', name: 'Albus', pnl24h: 675645.88, pnl7d: 990000, pnl30d: 2100000, pnlAll: 5900000, followers: 15200, trades: 760, wallet: null, hue: 120 },
  { handle: 'motiyawerey', name: 'motiyawerey', pnl24h: 612000.1, pnl7d: 1613363.22, pnl30d: 2650000, pnlAll: 7200000, followers: 22600, trades: 1130, wallet: '0x02aa…f31c', hue: 0 },
  { handle: 'BIGWARZ', name: 'BIGWARZ', pnl24h: 270200, pnl7d: 610000, pnl30d: 1400000, pnlAll: 3900000, followers: 11900, trades: 640, wallet: '0xb1c4…5e8a', hue: 45 },
  { handle: 'TheCrow', name: 'TheCrow', pnl24h: 30000, pnl7d: 92000, pnl30d: 310000, pnlAll: 880000, followers: 318, trades: 210, wallet: '0x5d6e…aa10', hue: 290 },
  { handle: 'Arz', name: 'Arz', pnl24h: -12400, pnl7d: 44000, pnl30d: 150000, pnlAll: 420000, followers: 453, trades: 155, wallet: null, hue: 180 },
]

export const coins: Coin[] = [
  { address: '0x39dbed3a2bd333467115de45665cc57f813c4571', name: 'Proteus Season', symbol: 'PROTEUS', kol: 'Proteus', launcher: '0x1f…9a', mcap: 794500, price: 0.000795, change24h: 42.3, vol24h: 141000, holders: 812, feesEth: 3.21, endorsed: true, createdAt: '2h', hue: 210, graduated: true },
  { address: '0xf2915d1e3c1b0c769d0c756ec43f1c1f6c99cd03', name: 'eric is main', symbol: 'ERIC', kol: 'econoar', launcher: '0x7c…d4', mcap: 261000, price: 0.000261, change24h: -14.3, vol24h: 58000, holders: 344, feesEth: 1.08, endorsed: false, createdAt: '5h', hue: 30, graduated: false },
  { address: '0xc2362aff2a2a4cc1f48cf3dab2c4e2605eb94ba3', name: 'Aurelius Empire', symbol: 'EMPIRE', kol: 'Aurelius0121', launcher: '0x9e…11', mcap: 1180000, price: 0.00118, change24h: 198.3, vol24h: 402000, holders: 1290, feesEth: 6.77, endorsed: true, createdAt: '1d', hue: 270, graduated: true },
  { address: '0xea97dfed19cfc581627a433dc4cd35418d298667', name: 'achi', symbol: 'ACHI', kol: 'achitaka', launcher: '0x3b…c0', mcap: 44100, price: 0.0000441, change24h: 12.9, vol24h: 9800, holders: 96, feesEth: 0.14, endorsed: false, createdAt: '3d', hue: 340, graduated: false },
  { address: '0x1111000000000000000000000000000000000001', name: 'BIGWARZ Army', symbol: 'ARMY', kol: 'BIGWARZ', launcher: '0xa0…7f', mcap: 128000, price: 0.000128, change24h: 63.1, vol24h: 31000, holders: 210, feesEth: 0.52, endorsed: false, createdAt: '6h', hue: 45, graduated: false },
  { address: '0x1111000000000000000000000000000000000002', name: 'moti', symbol: 'MOTI', kol: 'motiyawerey', launcher: '0xe4…22', mcap: 21000, price: 0.000021, change24h: -31.5, vol24h: 4100, holders: 58, feesEth: 0.06, endorsed: false, createdAt: '9h', hue: 0, graduated: false },
]

export const fmtUsd = (n: number, opts: { compact?: boolean; sign?: boolean } = {}) => {
  const { compact = false, sign = false } = opts
  const abs = Math.abs(n)
  let s: string
  if (compact) {
    if (abs >= 1e9) s = (abs / 1e9).toFixed(1) + 'B'
    else if (abs >= 1e6) s = (abs / 1e6).toFixed(1) + 'M'
    else if (abs >= 1e3) s = (abs / 1e3).toFixed(1) + 'K'
    else s = abs.toFixed(0)
  } else {
    s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const prefix = sign ? (n < 0 ? '-' : '+') : n < 0 ? '-' : ''
  return `${prefix}$${s}`
}

export const fmtPrice = (p: number) => {
  if (p >= 1) return '$' + p.toFixed(2)
  const s = p.toFixed(10).replace(/0+$/, '')
  const m = s.match(/^0\.(0+)(\d+)$/)
  if (m && m[1].length >= 3) return `$0.0<sub>${m[1].length}</sub>${m[2].slice(0, 4)}`
  return '$' + p.toPrecision(3)
}

export const fmtPct = (n: number) => `${n > 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`
