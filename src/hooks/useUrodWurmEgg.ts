import { useEffect, useState } from 'react'
import { dateString } from '../lib/date'
import type { Profile } from '../lib/types'

const UROD_WURM_PROFILES = ['Dinachka', 'Dinachka2']

function todayKey(profileId: string) {
  return `urod-wurm-${profileId}-${dateString(new Date())}`
}

export function useUrodWurmEgg(profile: Profile | null) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (!UROD_WURM_PROFILES.includes(profile.display_name)) return

    const key = todayKey(profile.id)
    if (localStorage.getItem(key)) return

    const interval = setInterval(() => {
      if (localStorage.getItem(key)) {
        clearInterval(interval)
        return
      }
      if (Math.random() < 0.15) {
        localStorage.setItem(key, '1')
        setShow(true)
        clearInterval(interval)
      }
    }, 30_000)

    return () => clearInterval(interval)
  }, [profile?.id])

  function dismiss() {
    setShow(false)
  }

  return { show, dismiss }
}
