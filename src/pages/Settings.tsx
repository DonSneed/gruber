import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MENU = [
  { to: '/settings/members', label: 'Household members' },
  { to: '/settings/theme', label: 'Theme' },
  { to: '/settings/flags', label: 'Flags' },
]

export function Settings() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <Link to="/" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Today
        </Link>

        <h1 className="text-2xl font-semibold">Settings</h1>

        <div className="overflow-hidden rounded-lg bg-cream text-ink shadow">
          {MENU.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-stone/10 ${
                i > 0 ? 'border-t border-stone/10' : ''
              }`}
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-stone" />
            </Link>
          ))}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-on-page/60 hover:text-on-page hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
