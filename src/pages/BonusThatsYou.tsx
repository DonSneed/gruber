import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const imageModules = import.meta.glob('../assets/thats-you/*.{png,jpg,jpeg,gif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const images = Object.values(imageModules) as string[]

function randomPick(current: string | null): string | null {
  if (images.length === 0) return null
  if (images.length === 1) return images[0]
  const pool = images.filter((img) => img !== current)
  return pool[Math.floor(Math.random() * pool.length)]
}

export function BonusThatsYou() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState<string | null>(() => randomPick(null))

  return (
    <div className="px-4 pb-8 pt-14">
      <div className="mx-auto max-w-sm space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-on-page/80 hover:text-on-page hover:underline"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold">That's you 👆</h1>
        <div className="rounded-lg bg-cream p-4 text-ink shadow">
          {images.length === 0 ? (
            <p className="text-sm text-stone">No images yet.</p>
          ) : (
            <div className="space-y-3">
              {current && (
                <img src={current} alt="That's you" className="w-full rounded object-contain" />
              )}
              <button
                onClick={() => setCurrent((cur) => randomPick(cur))}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
              >
                Another one
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
