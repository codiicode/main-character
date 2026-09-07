import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Rocket, Users, Wallet } from 'lucide-react'
import { Button } from './components/ui'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 select-none">
      <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-text-primary text-bg-primary font-black text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_6px_16px_-6px_rgba(255,255,255,.5)]">M</span>
      <span className="text-[22px] font-bold tracking-tight lowercase">main</span>
    </Link>
  )
}

export default function App() {
  const loc = useLocation()
  const nav = useNavigate()
  const tabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/launch', icon: Rocket, label: 'Launch' },
    { to: '/kols', icon: Users, label: 'KOLs' },
    { to: '/me', icon: Wallet, label: 'Me' },
  ]
  return (
    <div className="min-h-dvh relative">
      <div className="ambient" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 hidden md:block px-5 pt-4">
        <div className="mx-auto max-w-[1400px] panel rounded-full h-16 px-3 pl-5 flex items-center gap-5">
          <Logo />
          <nav className="flex items-center gap-0.5 text-[15px]">
            {[
              ['/', 'Leaderboard'],
              ['/kols', 'KOLs'],
              ['/launch', 'Launch'],
              ['/how-it-works', 'How it works'],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3.5 h-9 inline-flex items-center rounded-full font-semibold transition-all ${
                    isActive ? 'glass text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => nav('/search')} className="flex-1 max-w-md mx-auto well h-10 rounded-full flex items-center px-4 gap-2 text-text-secondary text-[15px] hover:text-text-primary transition-colors">
            <Search size={16} />
            <span className="flex-1 text-left">Search KOLs or coins</span>
            <kbd className="text-[11px] px-1.5 h-5 rounded-md bg-white/8 text-text-secondary grid place-items-center font-mono">/</kbd>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" to="/launch"><Rocket size={16} /> Launch</Button>
            <Button variant="primary" size="sm" to="/me">Connect</Button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 px-3 pt-3">
        <div className="panel rounded-full h-14 pl-4 pr-2 flex items-center justify-between">
          <Logo />
          <Button variant="primary" size="sm" to="/me">Connect</Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-3 md:px-5 pb-32 md:pb-16 pt-5 md:pt-8">
        <Outlet key={loc.pathname} />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="panel panel-strong rounded-full h-16 px-2 flex items-center justify-around">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={label}
              className={({ isActive }) =>
                `w-12 h-12 grid place-items-center rounded-full transition-all ${
                  isActive ? 'glass text-text-primary' : 'text-text-secondary'
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
