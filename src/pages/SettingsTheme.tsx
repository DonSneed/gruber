import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { applyTheme, THEME_PRESETS } from '../lib/themes'

export function SettingsTheme() {
  const { profile, refreshProfile } = useAuth()
  const [savingTheme, setSavingTheme] = useState(false)

  async function handleSelectTheme(bg: string) {
    if (!profile || savingTheme) return
    setSavingTheme(true)
    applyTheme(bg)
    const { error } = await supabase.from('profiles').update({ theme_color: bg }).eq('id', profile.id)
    if (!error) await refreshProfile()
    setSavingTheme(false)
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-sm space-y-4">
        <Link to="/settings" className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Settings
        </Link>

        <h1 className="text-2xl font-semibold">Theme</h1>

        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          <div className="flex gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.bg}
                onClick={() => handleSelectTheme(preset.bg)}
                title={preset.label}
                style={{ backgroundColor: preset.bg }}
                className={`h-8 w-8 rounded-full border-2 ${
                  profile?.theme_color === preset.bg ? 'border-forest' : 'border-stone/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
