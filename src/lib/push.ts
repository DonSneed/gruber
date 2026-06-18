import { supabase } from './supabase'

// Generate with: npx web-push generate-vapid-keys
// Then paste the public key here and add the private key to Supabase secrets as VAPID_PRIVATE_KEY
export const VAPID_PUBLIC_KEY = 'BBOtiD32YlyTlIaGLU58pRXcRvcOddxKoWq27mjw2zqf0mTkpvaYCIvBWjsbfm8b__a-WFbd6nKq1skRu_LiWqQ'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function registerPushSubscription(profileId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (VAPID_PUBLIC_KEY.startsWith('REPLACE')) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }

  await supabase.from('push_subscriptions').upsert(
    { profile_id: profileId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' },
  )

  return true
}

export async function unregisterPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}
