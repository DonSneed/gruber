import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', icon: '🎯' },
  { to: '/stories', label: 'Stories', icon: '📖' },
  { to: '/calendar', label: 'Calendar', icon: '🗓️' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-on-page/10 bg-page">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-on-page' : 'text-on-page/40'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}