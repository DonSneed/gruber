// Stable color per family member, based on their position in the (creation-ordered)
// member list. Same palette used for Today's timeline and, later, the Calendar.

const PALETTE = [
  { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' },
  { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700' },
  { dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
]

const FALLBACK = { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-700' }

export function colorForProfile(profileId: string | null, memberIds: string[]) {
  if (!profileId) return FALLBACK
  const index = memberIds.indexOf(profileId)
  if (index === -1) return FALLBACK
  return PALETTE[index % PALETTE.length]
}