import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'

export function Avatar({ name, hue, src, size = 40, className = '' }: { name: string; hue: number; src?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  const initials = name.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
  const showImg = !!src && !broken
  return (
    <div
      className={`shrink-0 rounded-full grid place-items-center font-bold text-text-primary overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 60% 30%))`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
      }}
    >
      {showImg ? (
        <img src={src!} alt="" width={size} height={size} loading="lazy" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initials
      )}
    </div>
  )
}

export function Pill({ children, active = false, onClick, className = '' }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 h-9 rounded-xl text-[15px] font-medium transition-colors ${
        active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Segment<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1 text-[15px] tabular">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 h-8 rounded-lg font-medium transition-colors ${
            value === o ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  to,
  onClick,
  disabled,
}: {
  children: ReactNode
  variant?: 'primary' | 'glass' | 'ghost' | 'green'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  to?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none'
  const sizes = { sm: 'h-9 px-4 text-[15px] rounded-xl', md: 'h-11 px-5 text-base rounded-xl', lg: 'h-13 px-6 text-lg rounded-xl' }
  const variants = {
    primary: 'bg-primary text-white hover:brightness-110',
    glass: 'glass text-text-primary hover:bg-white/15',
    ghost: 'bg-bg-tertiary text-text-primary hover:bg-white/15',
    green: 'bg-green text-black hover:brightness-110',
  }
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={cls}>{children}</Link>
  return <button className={cls} onClick={onClick} disabled={disabled}>{children}</button>
}

export function Pnl({ value, className = '', compact = false }: { value: number; className?: string; compact?: boolean }) {
  const pos = value >= 0
  const abs = Math.abs(value)
  const s = compact
    ? abs >= 1e6 ? (abs / 1e6).toFixed(1) + 'M' : abs >= 1e3 ? (abs / 1e3).toFixed(1) + 'K' : abs.toFixed(0)
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className={`tabular font-bold ${pos ? 'text-green' : 'text-red'} ${className}`}>
      {pos ? '+' : '-'}${s}
    </span>
  )
}

export function Change({ value, className = '' }: { value: number; className?: string }) {
  const pos = value >= 0
  return (
    <span className={`tabular font-medium ${pos ? 'text-green' : 'text-red'} ${className}`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

export function Verified({ className = '' }: { className?: string }) {
  return <BadgeCheck className={`text-primary ${className}`} size={16} strokeWidth={2.5} fill="#516af6" color="#0b0a14" />
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card rounded-2xl px-4 py-3 min-w-0">
      <div className="text-text-secondary text-[13px] font-medium truncate">{label}</div>
      <div className="text-[17px] font-bold tabular mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[13px] mt-0.5">{sub}</div>}
    </div>
  )
}

export function Tag({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' | 'green' | 'yellow' | 'dev' }) {
  const tones = {
    muted: 'bg-bg-tertiary text-text-secondary',
    primary: 'bg-primary-transparent text-[#9aa8ff]',
    green: 'bg-green-transparent text-green',
    yellow: 'bg-warning-transparent text-warning',
    dev: 'bg-[#fd5dd31f] text-dev',
  }
  return <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-md text-[12px] font-bold ${tones[tone]}`}>{children}</span>
}
