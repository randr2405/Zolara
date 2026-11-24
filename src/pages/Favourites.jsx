import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useFavourites } from '../context/FavouritesContext.jsx'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`

function HeartIcon({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </svg>
  )
}

function SkeletonGrid({ count }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading your favourites"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gold/30 bg-white">
          <div className="aspect-square w-full bg-cream" />
          <div className="p-3 sm:p-4">
            <div className="h-4 w-3/4 rounded bg-cream" />
            <div className="mt-2 h-3 w-1/3 rounded bg-cream" />
            <div className="mt-2 h-3 w-1/2 rounded bg-cream" />
          </div>
        </div>
      ))}
    </div>
  )
}

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
  const unavailable = loading ? 0 : order.length - listings.length

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Your favourites</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            {loading
              ? 'Products and services you have saved for later.'
              : listings.length === 0
                ? 'Products and services you have saved for later.'
                : `${listings.length} saved ${listings.length === 1 ? 'item' : 'items'}, ready when you are.`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {loading && <SkeletonGrid count={Math.min(Math.max(order.length, 4), 8)} />}

        {!loading && listings.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream text-gold-deep">
              <HeartIcon />
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-emerald-brand">Nothing saved yet</p>
            <p className="mt-2 text-sm text-charcoal/70">
              Tap the heart on a product or service to keep it here.
            </p>
            <Link to="/shop" className={`${btnPrimary} mt-5`}>
              Browse the shop
            </Link>
          </div>
        )}

        {!loading && unavailable > 0 && listings.length > 0 && (
          <p role="status" className="mb-5 rounded-xl bg-white px-4 py-3 text-sm text-gold-deep ring-1 ring-gold/40">
            {unavailable === 1
              ? '1 saved item is no longer available.'
              : `${unavailable} saved items are no longer available.`}
          </p>
        )}

        {!loading && listings.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <li
                key={l.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <FavouriteButton listingId={l.id} className="absolute right-2 top-2 z-10" />
                <Link
                  to={`/listing/${l.id}`}
                  aria-label={l.title}
                  className="block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                >
                  {l.thumb ? (
                    <img
                      src={l.thumb}
                      alt={l.title}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center bg-cream text-gold-deep/50">
                      <HeartIcon size={36} />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  {l.sellerPreferred && (
                    <p className="mb-2 inline-block self-start rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-gold-deep ring-1 ring-gold/60">
                      {PREFERRED_LABEL}
                    </p>
                  )}
                  <Link
                    to={`/listing/${l.id}`}
                    className="block truncate font-semibold text-emerald-brand focus:outline-none focus-visible:underline"
                  >
                    {l.title}
                  </Link>
                  <p className="mt-0.5 text-sm font-semibold text-gold-deep">{formatZAR(l.priceCents)}</p>
                  <p className="mt-auto truncate pt-2 text-xs text-charcoal/70">
                    <Link
                      to={`/supplier/${l.sellerId}`}
                      className="inline-flex min-h-[32px] items-center underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {l.sellerName}
                    </Link>
                    {l.city ? ` · ${l.city}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}