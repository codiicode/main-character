import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, User } from 'lucide-react'

/** FOMO serves `_small` thumbnails; drop the suffix for the full-size file. */
export const largeAvatar = (src?: string | null) => (src ? src.replace('_small.', '.') : src)

export function Avatar({ name, hue, src, size = 40, className = '', large = false, glow = false }: { name: string; hue: number; src?: string | null; size?: number; className?: string; large?: boolean; glow?: boolean }) {
  const [broken, setBroken] = useState(false)
  const url = large ? largeAvatar(src) : src
  const showImg = !!url && !broken
  return (
    <div
      className={`shrink-0 rounded-full grid place-items-center overflow-hidden ${className}`}
      aria-label={name}
      style={{
        width: size,
        height: size,
        background: showImg ? '#12111a' : `linear-gradient(160deg, rgba(255,255,255,.14), rgba(255,255,255,.04)), hsl(${hue} 30% 18%)`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,.16), inset 0 1px 0 rgba(255,255,255,.28), 0 6px 16px -6px rgba(0,0,0,.7)${glow ? `, 0 0 ${size * 0.6}px -${size * 0.15}px hsl(${hue} 80% 60% / .55)` : ''}`,
      }}
    >
      {showImg ? (
        <img src={url!} alt="" width={size} height={size} loading={large ? "eager" : "lazy"} decoding="async" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <User size={size * 0.5} strokeWidth={1.75} className="text-text-secondary" />
      )}
    </div>
  )
}

/** Overlapping row of avatars. */
export function AvatarStack({ items, size = 32, max = 6 }: { items: { name: string; hue: number; src?: string | null }[]; size?: number; max?: number }) {
  return (
    <div className="flex -space-x-2.5">
      {items.slice(0, max).map((a, i) => (
        <Avatar key={i} name={a.name} hue={a.hue} src={a.src} size={size} className="ring-2 ring-[#0b0a16]" />
      ))}
    </div>
  )
}

/** Floating glass sheet. */
export function Panel({ children, className = '', strong = false }: { children: ReactNode; className?: string; strong?: boolean }) {
  return <div className={`${strong ? 'panel panel-strong' : 'panel'} rounded-3xl ${className}`}>{children}</div>
}

export function Pill({ children, active = false, onClick, className = '' }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 h-9 rounded-full text-[15px] font-medium transition-colors ${
        active ? 'glass text-text-primary' : 'text-text-secondary hover:text-text-primary'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Segment<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="well rounded-full p-1 flex items-center gap-0.5 text-[14px] tabular">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 h-7 rounded-full font-semibold transition-all ${
            value === o ? 'glass text-text-primary' : 'text-text-secondary hover:text-text-primary'
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
  href,
  onClick,
  disabled,
}: {
  children: ReactNode
  variant?: 'primary' | 'glass' | 'ghost' | 'green'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  to?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap'
  const sizes = { sm: 'h-9 px-4 text-[15px] rounded-xl', md: 'h-11 px-5 text-base rounded-2xl', lg: 'h-13 px-6 text-lg rounded-2xl' }
  const variants = {
    primary: 'glass-primary text-white hover:brightness-110',
    glass: 'glass text-text-primary hover:brightness-125',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
    green: 'glass-green text-black hover:brightness-110',
  }
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={cls}>{children}</Link>
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>
  return <button className={cls} onClick={onClick} disabled={disabled}>{children}</button>
}

export function IconButton({ children, className = '', onClick, label }: { children: ReactNode; className?: string; onClick?: () => void; label: string }) {
  return (
    <button aria-label={label} onClick={onClick} className={`glass w-10 h-10 rounded-full grid place-items-center text-text-primary hover:brightness-125 transition-all ${className}`}>
      {children}
    </button>
  )
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
    <span className={`tabular font-semibold ${pos ? 'text-green' : 'text-red'} ${className}`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

export function Verified({ className = '' }: { className?: string }) {
  return <BadgeCheck className={`text-primary shrink-0 ${className}`} size={16} strokeWidth={2.5} fill="#516af6" color="#0b0a14" />
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="well rounded-2xl px-4 py-3 min-w-0">
      <div className="text-text-secondary text-[13px] font-medium truncate">{label}</div>
      <div className="text-[18px] font-bold tabular mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[13px] mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

export function Tag({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' | 'green' | 'yellow' | 'dev' }) {
  const tones = {
    muted: 'bg-white/8 text-text-secondary',
    primary: 'bg-primary/25 text-[#aab5ff]',
    green: 'bg-green/20 text-green',
    yellow: 'bg-warning/15 text-warning',
    dev: 'bg-dev/15 text-dev',
  }
  return <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-lg text-[12px] font-bold whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="well rounded-2xl p-8 text-center">
      <div className="font-bold text-[17px]">{title}</div>
      {body && <p className="text-text-secondary text-[14px] mt-1 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
