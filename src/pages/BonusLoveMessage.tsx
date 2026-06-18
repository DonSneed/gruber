import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { registerPushSubscription, unregisterPushSubscription, VAPID_PUBLIC_KEY } from '../lib/push'

const ENRICO_PROFILE = 'Enrico'

export function BonusLoveMessage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [message, setMessage] = useState('Ich liebe dich, Dinachka :)')
  const [active, setActive] = useState(true)
  const [configId, setConfigId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [registering, setRegistering] = useState(false)

  const isEnrico = profile?.display_name === ENRICO_PROFILE
  const vapidReady = !VAPID_PUBLIC_KEY.startsWith('REPLACE')

  useEffect(() => {
    if (!isEnrico) { navigate('/bonus', { replace: true }); return }
    load()
    checkNotifStatus()
  }, [])

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('love_message_config')
      .select('*')
      .eq('family_id', profile.family_id)
      .maybeSingle()
    if (data) {
      setMessage(data.message)
      setActive(data.active)
      setConfigId(data.id)
    }
  }

  function checkNotifStatus() {
    if (!('Notification' in window)) { setNotifStatus('unsupported'); return }
    setNotifStatus(Notification.permission as 'granted' | 'denied' | 'default' === 'granted' ? 'granted' : 'unknown')
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    if (configId) {
      await supabase
        .from('love_message_config')
        .update({ message, active, updated_at: new Date().toISOString() })
        .eq('id', configId)
    } else {
      const { data } = await supabase
        .from('love_message_config')
        .insert({ family_id: profile.family_id, message, active })
        .select('id')
        .single()
      if (data) setConfigId(data.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleEnableNotifications() {
    if (!profile) return
    setRegistering(true)
    const ok = await registerPushSubscription(profile.id)
    setNotifStatus(ok ? 'granted' : 'denied')
    setRegistering(false)
  }

  async function handleDisableNotifications() {
    setRegistering(true)
    await unregisterPushSubscription()
    setNotifStatus('unknown')
    setRegistering(false)
  }

  if (!isEnrico) return null

  return (
    <div className="px-4 pb-8 pt-14">
      <div className="mx-auto max-w-sm space-y-4">
        <button onClick={() => navigate(-1)} className="text-sm text-on-page/80 hover:text-on-page hover:underline">
          &larr; Back
        </button>

        <h1 className="text-2xl font-semibold">Daily love message 💌</h1>

        <div className="rounded-lg bg-cream p-4 text-ink shadow space-y-3">
          <p className="text-xs text-stone">
            Sent to Dinachka once per day at a random time between 10am and 10pm.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded border border-stone/30 px-3 py-2 text-sm focus:border-forest focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-forest"
            />
            <label htmlFor="active" className="text-sm">Send daily notifications</label>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="rounded-lg bg-cream p-4 text-ink shadow space-y-3">
          <h2 className="font-medium">Notifications on this device</h2>

          {!vapidReady ? (
            <p className="text-xs text-stone">
              VAPID keys not configured yet — see setup instructions.
            </p>
          ) : notifStatus === 'unsupported' ? (
            <p className="text-xs text-stone">Push notifications not supported on this browser.</p>
          ) : notifStatus === 'granted' ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-forest">Notifications enabled ✓</span>
              <button
                onClick={handleDisableNotifications}
                disabled={registering}
                className="flex items-center gap-1 rounded border border-stone/30 px-2 py-1 text-xs text-stone hover:bg-stone/10"
              >
                <BellOff className="h-3.5 w-3.5" /> Disable
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={registering}
              className="flex items-center gap-2 rounded bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {registering ? 'Enabling…' : 'Enable on this device'}
            </button>
          )}

          <p className="text-xs text-stone/70">
            Dinachka also needs to enable notifications on her device — she'll see this same button in her Bonus → Love message page.
          </p>
        </div>
      </div>
    </div>
  )
}
