import { useState } from 'react'
import { Tag } from 'lucide-react'
import { Collapse } from './Collapse'
import type { Flag } from '../lib/types'

export function FlagPicker({
  flags,
  assignedFlagIds,
  onToggle,
}: {
  flags: Flag[]
  assignedFlagIds: string[]
  onToggle: (flagId: string) => void
}) {
  const [open, setOpen] = useState(false)

  if (flags.length === 0) return null

  const assigned = flags.filter((f) => assignedFlagIds.includes(f.id))

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {assigned.map((flag) => (
          <span
            key={flag.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
            style={{ backgroundColor: flag.color }}
          >
            {flag.name}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          title="Flags"
          className={`rounded p-1 ${open ? 'bg-forest text-white' : 'text-stone hover:bg-stone/10 hover:text-forest'}`}
        >
          <Tag className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute right-0 top-full z-20 mt-1">
        <Collapse open={open}>
          <div className="flex w-48 flex-wrap gap-1 rounded bg-cream p-2 shadow-lg ring-1 ring-stone/10">
            {flags.map((flag) => {
              const isAssigned = assignedFlagIds.includes(flag.id)
              return (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => onToggle(flag.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    isAssigned ? 'text-white' : 'text-stone ring-1 ring-inset ring-stone/30 hover:bg-stone/10'
                  }`}
                  style={isAssigned ? { backgroundColor: flag.color } : undefined}
                >
                  {flag.name}
                </button>
              )
            })}
          </div>
        </Collapse>
      </div>
    </div>
  )
}
