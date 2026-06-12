import type { ReactNode } from 'react'

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-out ${
        open ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}