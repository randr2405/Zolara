import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'
import { MIN_REVIEWS, summarize } from '../lib/ratings.js'
import RatingBadge from '../components/RatingBadge.jsx'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`

const ICONS = {
  back: 'M15 6l-6 6 6 6',
  pin: 'M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
}

function Icon({ name, size = 18 }) {
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
      <path d={ICONS[name]} />
    </svg>
  )
}

const statusOf = (s) => s.status || (s.verified ? 'approved' : 'pending')

function Skeleton() {
  return (
    <div className="bg-cream" role="status" aria-label="Loading supplier">
      <div className="animate-pulse border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-cream/20" />
          <div className="flex-1">
            <div className="h-7 w-1/2 rounded bg-cream/20" />
            <div className="mt-2 h-4 w-1/4 rounded bg-cream/20" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl animate-pulse px-5 pt-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-gold/30 bg-white">
              <div className="aspect-square w-full bg-cream" />
              <div className="p-3">
                <div className="h-4 w-3/4 rounded bg-cream" />
                <div className="mt-2 h-3 w-1/3 rounded bg-cream" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Supplier() {
  const { id } = useParams()
  const [seller, setSeller] = useState(undefined)
  const [listings, setListings] = useState([])
  const [reviews, setReviews] = useState([])
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    let alive = true
    setSeller(undefined)
    setTypeFilter('all')
    async function load() {
      try {
        const s = await getDoc(doc(db, 'sellers', id))
        if (!s.exists() || statusOf(s.data()) !== 'approved') {
          if (alive) setSeller(null)
          return
        }
        const [ls, rs] = await Promise.all([
          getDocs(
            query(
              collection(db, 'listings'),
              where('sellerId', '==', id),
              where('active', '==', true),
              where('sellerApproved', '==', true)
            )
          ),
          getDocs(query(collection(db, 'reviews'), where('sellerId', '==', id))).catch(() => ({ docs: [] })),
        ])
        if (!alive) return
        const items = ls.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setListings(items)
        setReviews(rs.docs.map((d) => d.data()))
        setSeller(s.data())
      } catch (err) {
        console.error(err)
        if (alive) setSeller(null)
      }
    }
    load()
    return () => { alive = false }
  }, [id])

  if (seller === undefined) return <Skeleton />

  if (seller === null) {
    return (
      <div className="bg-cream px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
          <p className="font-display text-xl font-semibold text-emerald-brand">This supplier isn’t available</p>
          <p className="mt-2 text-sm text-charcoal/70">They may no longer be listed on Zolara.</p>
          <Link to="/shop" className={`${btnPrimary} mt-5`}>
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  const rating = summarize(reviews)
  const initial = (seller.businessName || '?').trim().charAt(0).toUpperCase()
  const hasProducts = listings.some((l) => l.type !== 'service')
  const hasServices = listings.some((l) => l.type === 'service')
  const showTypePills = hasProducts && hasServices
  const shown = listings.filter(
    (l) => typeFilter === 'all' || (typeFilter === 'service' ? l.type === 'service' : l.type !== 'service')
  )

  const typeOptions = [
    ['all', 'Everything', listings.length],
    ['product', 'Products', listings.filter((l) => l.type !== 'service').length],
    ['service', 'Services', listings.filter((l) => l.type === 'service').length],
  ]

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/shop"
            className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-cream/85 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <Icon name="back" />
            Back to shop
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            {seller.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt=""
                className="h-20 w-20 flex-none rounded-full object-cover ring-2 ring-gold sm:h-24 sm:w-24"
              />
            ) : (
              <div
                className="grid h-20 w-20 flex-none place-items-center rounded-full bg-cream font-display text-3xl font-semibold text-emerald-brand sm:h-24 sm:w-24 sm:text-4xl"
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-2xl font-semibold leading-tight sm:text-4xl">
                {seller.businessName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {seller.city && (
                  <span className="inline-flex items-center gap-1 text-sm text-cream/85">
                    <Icon name="pin" size={16} />
                    {seller.city}
                  </span>
                )}
                {seller.preferred && (
                  <span className="rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-emerald-brand">
                    {PREFERRED_LABEL}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className={`mb-8 grid gap-4 ${seller.description ? 'md:grid-cols-[1fr_280px]' : ''}`}>
          {seller.description && (
            <section className="rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-lg font-semibold text-emerald-brand">About</h2>
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-charcoal/90 sm:text-base">
                {seller.description}
              </p>
            </section>
          )}
          <section className="rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-emerald-brand">Customer satisfaction</h2>
            <div className="mt-3">
              <RatingBadge rating={rating} large />
            </div>
            <p className="mt-3 text-xs text-charcoal/70">
              After every completed service or delivered order, we ask the customer whether they were satisfied.
              The score shows once a supplier has at least {MIN_REVIEWS} reviews.
            </p>
          </section>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-emerald-brand">Products and services</h2>
          {listings.length > 0 && (
            <p role="status" className="text-sm text-gold-deep">
              {shown.length} {shown.length === 1 ? 'listing' : 'listings'}
            </p>
          )}
        </div>

        {showTypePills && (
          <div
            className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            role="group"
            aria-label="Listing type"
          >
            {typeOptions.map(([v, label, n]) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                aria-pressed={typeFilter === v}
                className={`inline-flex min-h-[44px] flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                  typeFilter === v
                    ? 'bg-emerald-brand text-cream'
                    : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
              >
                {label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    typeFilter === v ? 'bg-cream/20 text-cream' : 'bg-cream text-gold-deep'}`}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-emerald-brand">Nothing listed right now</p>
            <p className="mt-2 text-sm text-charcoal/70">Check back soon, or browse other suppliers.</p>
            <Link to="/shop" className={`${btnPrimary} mt-5`}>
              Browse the shop
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {shown.map((l) => (
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
                      <Icon name="box" size={36} />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <span className="mb-2 inline-block self-start rounded-full bg-emerald-brand px-2.5 py-0.5 text-[11px] font-medium text-cream">
                    {l.type === 'service' ? 'Service' : 'Product'}
                  </span>
                  <Link
                    to={`/listing/${l.id}`}
                    className="block truncate font-semibold text-emerald-brand focus:outline-none focus-visible:underline"
                  >
                    {l.title}
                  </Link>
                  <p className="mt-0.5 text-sm font-semibold text-gold-deep">{formatZAR(l.priceCents)}</p>
                  {l.category && <p className="mt-auto truncate pt-2 text-xs text-charcoal/70">{l.category}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}