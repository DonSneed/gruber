import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ENRICO_PROFILE = 'Enrico'

const allFeatures = [
  { to: '/bonus/thats-you', label: 'Das bist du!', icon: '👆', enricoOnly: false },
  { to: '/bonus/movies', label: 'Movies', icon: '🎬', enricoOnly: false },
  { to: '/bonus/suggestions', label: 'Suggestions', icon: '💡', enricoOnly: false },
  { to: '/bonus/love-message', label: 'Love message', icon: '💌', enricoOnly: true },
]

export function Bonus() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isEnrico = profile?.display_name === ENRICO_PROFILE

  const features = allFeatures.filter((f) => !f.enricoOnly || isEnrico)

  return (
    <div className="px-4 pb-8 pt-14">
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Bonus</h1>
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <button
              key={f.to}
              onClick={() => navigate(f.to)}
              className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-on-page/10 bg-cream p-4 text-ink shadow-sm transition-all duration-150 hover:border-forest hover:shadow-md active:scale-95"
            >
              <span className="text-4xl transition-transform duration-150 group-hover:scale-110">
                {f.icon}
              </span>
              <span className="text-center text-sm font-medium leading-tight">{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
