import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Today', icon: '🎯' },
  { to: '/stories', label: 'Stories', icon: '📖' },
  { to: '/calendar', label: 'Calendar', icon: '🗓️' },
  { to: '/bonus', label: 'Bonus', icon: '🎁' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed left-4 top-4 z-50 rounded p-1.5 text-on-page/60 hover:text-on-page"
        aria-label="Menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-52 bg-page shadow-lg transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="space-y-1 px-3 pt-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-on-page/10 text-on-page' : 'text-on-page/50 hover:bg-on-page/5 hover:text-on-page'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
