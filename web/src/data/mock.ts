// Coins are still mock until the Pons indexer exists. KOL handles reference real FOMO traders from /data/kols.json.
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

export const coins: Coin[] = [
  { address: '0x39dbed3a2bd333467115de45665cc57f813c4571', name: 'Proteus Season', symbol: 'PROTEUS', kol: 'Proteus', launcher: '0x1f…9a', mcap: 794500, price: 0.000795, change24h: 42.3, vol24h: 141000, holders: 812, feesEth: 3.21, endorsed: true, createdAt: '2h', hue: 210, graduated: true },
  { address: '0xf2915d1e3c1b0c769d0c756ec43f1c1f6c99cd03', name: 'eric is main', symbol: 'ERIC', kol: 'econoar', launcher: '0x7c…d4', mcap: 261000, price: 0.000261, change24h: -14.3, vol24h: 58000, holders: 344, feesEth: 1.08, endorsed: false, createdAt: '5h', hue: 30, graduated: false },
  { address: '0xc2362aff2a2a4cc1f48cf3dab2c4e2605eb94ba3', name: 'Ogle Empire', symbol: 'OGLE', kol: 'ogle', launcher: '0x9e…11', mcap: 1180000, price: 0.00118, change24h: 198.3, vol24h: 402000, holders: 1290, feesEth: 6.77, endorsed: true, createdAt: '1d', hue: 270, graduated: true },
  { address: '0xea97dfed19cfc581627a433dc4cd35418d298667', name: 'unipcs', symbol: 'UNI', kol: 'unipcs', launcher: '0x3b…c0', mcap: 44100, price: 0.0000441, change24h: 12.9, vol24h: 9800, holders: 96, feesEth: 0.14, endorsed: false, createdAt: '3d', hue: 340, graduated: false },
  { address: '0x1111000000000000000000000000000000000001', name: 'Avast Army', symbol: 'AVAST', kol: '0xAvast', launcher: '0xa0…7f', mcap: 128000, price: 0.000128, change24h: 63.1, vol24h: 31000, holders: 210, feesEth: 0.52, endorsed: false, createdAt: '6h', hue: 45, graduated: false },
  { address: '0x1111000000000000000000000000000000000002', name: 'moti', symbol: 'MOTI', kol: 'motiyawerey', launcher: '0xe4…22', mcap: 21000, price: 0.000021, change24h: -31.5, vol24h: 4100, holders: 58, feesEth: 0.06, endorsed: false, createdAt: '9h', hue: 0, graduated: false },
]

export const endorsedHandles = new Set(coins.filter((c) => c.endorsed).map((c) => c.kol.toLowerCase()))
export const isEndorsed = (handle: string) => endorsedHandles.has(handle.toLowerCase())
export const coinsFor = (handle: string) => coins.filter((c) => c.kol.toLowerCase() === handle.toLowerCase())

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

export const fmtCount = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n))
