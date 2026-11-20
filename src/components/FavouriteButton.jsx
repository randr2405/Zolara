import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useFavourites } from '../context/FavouritesContext.jsx'

function Heart({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
    </svg>
  )
}

export default function FavouriteButton({ listingId, className = '', label = false }) {
  const { user } = useAuth()
  const { ids, toggle } = useFavourites()
  const navigate = useNavigate()
  const saved = ids.has(listingId)

  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/login')
    toggle(listingId)
  }

  const text = saved ? 'Remove from favourites' : 'Save to favourites'

  if (label) {
    return (
      <button type="button" onClick={handleClick} aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border border-gold-deep px-5 py-2 text-sm ${
          saved ? 'text-red-700' : 'text-gold-deep'} ${className}`}>
        <Heart filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleClick} aria-pressed={saved} aria-label={text} title={text}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm ${
        saved ? 'text-red-700' : 'text-gold-deep'} ${className}`}>
      <Heart filled={saved} />
    </button>
  )
}