import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useFavourites } from '../context/FavouritesContext.jsx'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'

export default function Favourites() {
  const { order, ready } = useFavourites()
  const [cache, setCache] = useState({})

  useEffect(() => {
    const missing = order.filter((id) => !(id in cache))
    if (missing.length === 0) return undefined
    let alive = true
    Promise.all(
      missing.map((id) =>
        getDoc(doc(db, 'listings', id))
          .then((s) => {
            const d = s.exists() ? { id, ...s.data() } : null
            return [id, d && d.active && d.sellerApproved ? d : null]
          })
          .catch(() => [id, null])
      )
    ).then((pairs) => {
      if (alive) setCache((c) => ({ ...c, ...Object.fromEntries(pairs) }))
    })
    return () => { alive = false }
  }, [order, cache])

  const loading = !ready || order.some((id) => !(id in cache))
  const listings = order.map((id) => cache[id]).filter(Boolean)

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-emerald-brand">Your favourites</h1>

      {loading && <p>Loading…</p>}
      {!loading && listings.length === 0 && (
        <p className="text-sm">
          Nothing saved yet. Tap the heart on a product or service to keep it here.{' '}
          <Link to="/shop" className="text-emerald-brand underline">Browse the shop</Link>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {!loading && listings.map((l) => (
          <div key={l.id} className="relative overflow-hidden rounded-xl bg-white shadow-sm">
            <FavouriteButton listingId={l.id} className="absolute right-2 top-2" />
            <Link to={`/listing/${l.id}`}>
              {l.thumb
                ? <img src={l.thumb} alt={l.title} className="aspect-square w-full object-cover" />
                : <div className="aspect-square w-full bg-cream" />}
            </Link>
            <div className="p-3">
              {l.sellerPreferred && (
                <p className="mb-1 inline-block rounded-full bg-cream px-2 py-0.5 text-xs text-gold-deep">
                  {PREFERRED_LABEL}
                </p>
              )}
              <Link to={`/listing/${l.id}`} className="block truncate font-medium">{l.title}</Link>
              <p className="text-sm text-gold-deep">{formatZAR(l.priceCents)}</p>
              <p className="truncate text-xs">
                <Link to={`/supplier/${l.sellerId}`} className="underline">{l.sellerName}</Link> · {l.city}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}