import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'
import { deliverySummary } from '../lib/delivery.js'
import { summarize } from '../lib/ratings.js'
import RatingBadge from '../components/RatingBadge.jsx'

const btn =
  'inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnGold = `${btn} border border-gold-deep text-gold-deep hover:bg-gold-deep hover:text-white`

const ICONS = {
  back: 'M15 6l-6 6 6 6',
  clock: 'M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  pin: 'M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  truck: 'M3 6h11v10H3z M14 10h4l3 3v3h-7 M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
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

function Fact({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-charcoal ring-1 ring-gold/40">
      <span className="text-gold-deep">
        <Icon name={icon} size={16} />
      </span>
      {children}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-5 py-6 sm:px-8" role="status" aria-label="Loading listing">
      <div className="mb-5 h-4 w-28 rounded bg-white" />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square w-full rounded-2xl bg-white" />
          <div className="mt-3 flex gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 w-16 rounded-xl bg-white" />)}
          </div>
        </div>
        <div>
          <div className="h-4 w-1/3 rounded bg-white" />
          <div className="mt-3 h-9 w-3/4 rounded bg-white" />
          <div className="mt-4 h-8 w-1/4 rounded bg-white" />
          <div className="mt-6 h-24 w-full rounded bg-white" />
          <div className="mt-6 h-12 w-48 rounded-full bg-white" />
        </div>
      </div>
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [listing, setListing] = useState(undefined)
  const [photos, setPhotos] = useState([])
  const [active, setActive] = useState(0)
  const [itemRating, setItemRating] = useState(summarize([]))
  const [sellerRating, setSellerRating] = useState(summarize([]))

  useEffect(() => {
    async function load() {
      try {
        const s = await getDoc(doc(db, 'listings', id))
        if (!s.exists()) return setListing(null)
        setListing(s.data())
        const ph = await getDocs(query(collection(db, 'listings', id, 'photos'), orderBy('order')))
        setPhotos(ph.docs.map((p) => p.data().data))
        const empty = { docs: [] }
        const [lr, sr] = await Promise.all([
          getDocs(query(collection(db, 'reviews'), where('listingId', '==', id))).catch(() => empty),
          getDocs(query(collection(db, 'reviews'), where('sellerId', '==', s.data().sellerId))).catch(() => empty),
        ])
        setItemRating(summarize(lr.docs.map((d) => d.data())))
        setSellerRating(summarize(sr.docs.map((d) => d.data())))
      } catch {
        setListing(null)
      }
    }
    load()
  }, [id])

  if (listing === undefined) return <div className="bg-cream"><Skeleton /></div>

  if (listing === null) {
    return (
      <div className="bg-cream px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
          <p className="font-display text-xl font-semibold text-emerald-brand">This listing isn’t available</p>
          <p className="mt-2 text-sm text-charcoal/70">It may have been removed or is no longer active.</p>
          <Link to="/shop" className={`${btnPrimary} mt-5`}>
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  const images = photos.length ? photos : listing.thumb ? [listing.thumb] : []
  const isService = listing.type === 'service'
  const isOwner = user?.uid === listing.sellerId
  const outOfStock = !isService && (!listing.stock || listing.stock < 1)
  const lowStock = !isService && !outOfStock && listing.stock <= 5
  const initial = (listing.sellerName || '?').trim().charAt(0).toUpperCase()
  const place = `${listing.city || ''}${listing.province ? `, ${listing.province}` : ''}`.replace(/^, /, '')
  const extraNote = isService ? listing.travelNote : listing.deliveryNote

  let action = null
  let note = null
  if (isOwner) {
    note = { text: isService ? 'This is your own service.' : 'This is your own product.', tone: 'plain' }
  } else if (outOfStock) {
    note = { text: 'Out of stock', tone: 'danger' }
  } else if (isService) {
    action = { to: user ? `/listing/${id}/book` : '/login', label: user ? 'Book now' : 'Log in to book' }
  } else {
    action = { to: user ? `/listing/${id}/buy` : '/login', label: user ? 'Buy now' : 'Log in to buy' }
  }

  return (
    <div className="bg-cream pb-28 md:pb-0">
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <Link
          to="/shop"
          className="mb-5 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Icon name="back" />
          Back to shop
        </Link>

        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-sm">
              {images[active] ? (
                <img src={images[active]} alt={listing.title} className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square w-full place-items-center bg-white text-gold-deep/40">
                  <Icon name={isService ? 'clock' : 'box'} size={48} />
                </div>
              )}
              {images.length > 1 && (
                <span className="absolute bottom-3 right-3 rounded-full bg-charcoal/70 px-3 py-1 text-xs font-medium text-white">
                  {active + 1} / {images.length}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Photos">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-pressed={i === active}
                    className={`h-16 w-16 flex-none overflow-hidden rounded-xl border-2 bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      i === active ? 'border-emerald-brand' : 'border-transparent opacity-80 hover:opacity-100'}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-brand px-3 py-0.5 text-xs font-medium text-cream">
                {isService ? 'Service' : 'Product'}
              </span>
              <span className="text-sm text-gold-deep">
                {listing.category}
                {listing.subcategory ? ` › ${listing.subcategory}` : ''}
              </span>
            </div>

            <h1 className="mt-3 break-words font-display text-3xl font-semibold leading-tight text-emerald-brand sm:text-4xl">
              {listing.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold text-emerald-brand sm:text-3xl">{formatZAR(listing.priceCents)}</p>
              {listing.sellerPreferred && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gold-deep ring-1 ring-gold/60">
                  {PREFERRED_LABEL}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isService ? (
                <Fact icon="clock">{listing.durationMinutes} minutes</Fact>
              ) : (
                <Fact icon="box">{outOfStock ? 'None in stock' : `${listing.stock} in stock`}</Fact>
              )}
              {!isService && <Fact icon="truck">{deliverySummary(listing)}</Fact>}
              {place && <Fact icon="pin">{place}</Fact>}
            </div>
            {lowStock && <p className="mt-2 text-sm font-medium text-gold-deep">Only {listing.stock} left.</p>}

            {extraNote && (
              <p className="mt-3 rounded-xl border-l-4 border-gold bg-white px-4 py-3 text-sm">
                <span className="font-medium text-gold-deep">{isService ? 'Travel or call-out: ' : 'Delivery: '}</span>
                {extraNote}
              </p>
            )}

            {listing.description && (
              <p className="mt-5 whitespace-pre-line break-words text-sm leading-relaxed text-charcoal/90 sm:text-base">
                {listing.description}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-1 rounded-2xl border border-gold/40 bg-white p-4 text-sm shadow-sm">
              <RatingBadge rating={itemRating} subject={isService ? 'This service' : 'This product'} />
              <RatingBadge rating={sellerRating} subject="Supplier" />
            </div>

            <Link
              to={`/supplier/${listing.sellerId}`}
              className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/40 bg-white p-4 shadow-sm transition hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div
                className="grid h-12 w-12 flex-none place-items-center rounded-full bg-emerald-brand font-display text-xl font-semibold text-gold"
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gold-deep">Sold by</p>
                <p className="truncate font-semibold text-emerald-brand">{listing.sellerName}</p>
              </div>
              <span className="ml-auto text-sm font-medium text-emerald-brand underline">View supplier</span>
            </Link>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              {action && (
                <Link to={action.to} className={`${btnPrimary} hidden md:inline-flex`}>
                  {action.label}
                </Link>
              )}
              <FavouriteButton listingId={id} label />
            </div>

            {note && (
              <p className={`mt-4 text-sm ${note.tone === 'danger' ? 'font-semibold text-red-700' : 'text-charcoal/80'}`}>
                {note.text}
              </p>
            )}
          </div>
        </div>
      </main>

      {action && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/40 bg-white/95 px-5 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs text-charcoal/70">{listing.title}</p>
              <p className="font-semibold text-emerald-brand">{formatZAR(listing.priceCents)}</p>
            </div>
            <Link to={action.to} className={`${btnPrimary} ml-auto flex-none`}>
              {action.label}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}