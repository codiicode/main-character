import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { Home, Search, Rocket, Users, Wallet } from 'lucide-react'
import { Button } from './components/ui'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 select-none">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-text-primary text-bg-primary font-bold text-[15px] tracking-tighter">M</span>
      <span className="text-[22px] font-bold tracking-tight lowercase">main</span>
    </Link>
  )
}

export default function App() {
  const loc = useLocation()
  const tabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/launch', icon: Rocket, label: 'Launch' },
    { to: '/kols', icon: Users, label: 'KOLs' },
    { to: '/me', icon: Wallet, label: 'Me' },
  ]
  return (
    <div className="min-h-dvh bg-space">
      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden md:block">
        <div className="glass-dark border-b border-white/5">
          <div className="mx-auto max-w-[1400px] px-5 h-16 flex items-center gap-6">
            <Logo />
            <nav className="flex items-center gap-1 text-[15px]">
              {[
                ['/', 'Leaderboard'],
                ['/launch', 'Launch'],
                ['/kols', 'KOLs'],
                ['/docs', 'How it works'],
              ].map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 h-9 inline-flex items-center rounded-lg font-medium transition-colors ${
                      isActive ? 'text-text-primary bg-bg-tertiary' : 'text-text-secondary hover:text-text-primary'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="flex-1 max-w-xl mx-auto">
              <div className="h-10 rounded-xl bg-bg-secondary border border-white/5 flex items-center px-3 gap-2 text-text-secondary text-[15px]">
                <Search size={16} />
                <span className="flex-1">Search KOLs or coins…</span>
                <kbd className="text-[12px] px-1.5 h-5 rounded bg-bg-tertiary text-text-secondary grid place-items-center">/</kbd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="glass" size="sm" to="/launch"><Rocket size={16} /> Launch</Button>
              <Button variant="primary" size="sm">Connect</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 glass-dark border-b border-white/5">
        <div className="h-14 px-4 flex items-center justify-between">
          <Logo />
          <Button variant="primary" size="sm">Connect</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-5 pb-28 md:pb-12 pt-4 md:pt-6">
        <Outlet key={loc.pathname} />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="glass-dark rounded-full h-16 px-2 flex items-center justify-around shadow-[0_10px_40px_rgba(0,0,0,.5)]">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={label}
              className={({ isActive }) =>
                `w-12 h-12 grid place-items-center rounded-full transition-colors ${
                  isActive ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'
                }`
              }
            >
              <Icon size={22} strokeWidth={2.2} />
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
