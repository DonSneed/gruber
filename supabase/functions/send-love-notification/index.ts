import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const RECIPIENT_DISPLAY_NAME = 'Dinachka'
const TIMEZONE = 'Europe/Vienna'
const WINDOW_START_HOUR = 10
const WINDOW_END_HOUR = 22
const INTERVAL_MINUTES = 10

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  webpush.setVapidDetails(
    'mailto:' + Deno.env.get('VAPID_EMAIL')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  // Get current local time
  const now = new Date()
  const localTimeStr = now.toLocaleString('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false, minute: 'numeric' })
  const [hourStr, minuteStr] = localTimeStr.split(':')
  const localHour = parseInt(hourStr)
  const localMinute = parseInt(minuteStr)
  const localDateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }) // YYYY-MM-DD

  // Outside the notification window → skip
  if (localHour < WINDOW_START_HOUR || localHour >= WINDOW_END_HOUR) {
    return new Response(JSON.stringify({ skipped: 'outside window' }), { status: 200 })
  }

  // Find all families that have an active love message config
  const { data: configs } = await supabase
    .from('love_message_config')
    .select('family_id, message')
    .eq('active', true)

  if (!configs?.length) {
    return new Response(JSON.stringify({ skipped: 'no active configs' }), { status: 200 })
  }

  const results = []

  for (const config of configs) {
    // Already sent today?
    const { data: log } = await supabase
      .from('love_notifications_log')
      .select('sent_date')
      .eq('family_id', config.family_id)
      .eq('sent_date', localDateStr)
      .maybeSingle()

    if (log) continue

    // Probabilistic send: chance increases as window end approaches
    const minuteOfWindow = (localHour - WINDOW_START_HOUR) * 60 + localMinute
    const totalWindowMinutes = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 60
    const intervalsRemaining = Math.max(1, Math.ceil((totalWindowMinutes - minuteOfWindow) / INTERVAL_MINUTES))
    const sendProbability = 1 / intervalsRemaining

    if (Math.random() > sendProbability) continue

    // Find recipient's profile
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', config.family_id)
      .eq('display_name', RECIPIENT_DISPLAY_NAME)
      .maybeSingle()

    if (!recipient) continue

    // Get all push subscriptions for the recipient
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('profile_id', recipient.id)

    if (!subs?.length) continue

    const payload = JSON.stringify({ title: 'Everyday Manager', body: config.message })
    const staleEndpoints: string[] = []

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch {
        staleEndpoints.push(sub.endpoint)
      }
    }

    // Remove stale subscriptions
    if (staleEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
    }

    // Log as sent
    await supabase.from('love_notifications_log').insert({
      family_id: config.family_id,
      sent_date: localDateStr,
    })

    results.push({ family_id: config.family_id, sent: subs.length - staleEndpoints.length })
  }

  return new Response(JSON.stringify({ results }), { status: 200 })
})
