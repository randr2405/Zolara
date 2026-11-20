import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'
import { summarize } from '../lib/ratings.js'
import RatingBadge from '../components/RatingBadge.jsx'

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

  if (listing === undefined) return <p className="p-6 text-center">Loading…</p>
  if (listing === null) return <p className="p-6 text-center">This listing isn’t available.</p>

  const images = photos.length ? photos : listing.thumb ? [listing.thumb] : []
  const isService = listing.type === 'service'
  const isOwner = user?.uid === listing.sellerId

  return (
    <main className="mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-2">
      <div>
        {images[active]
          ? <img src={images[active]} alt={listing.title} className="w-full rounded-xl object-cover" />
          : <div className="aspect-square w-full rounded-xl bg-white" />}
        <div className="mt-3 flex gap-2">
          {images.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setActive(i)}
              className={`h-16 w-16 cursor-pointer rounded-lg object-cover ${i === active ? 'ring-2 ring-emerald-brand' : ''}`} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-gold-deep">
          {isService ? 'Service' : 'Product'} · {listing.category}
          {listing.subcategory ? ` › ${listing.subcategory}` : ''}
        </p>
        <h1 className="mb-2 text-3xl font-semibold text-emerald-brand">{listing.title}</h1>
        <p className="mb-4 text-2xl">{formatZAR(listing.priceCents)}</p>
        <p className="mb-4 whitespace-pre-line">{listing.description}</p>
        {listing.sellerPreferred && (
          <p className="mb-2 inline-block rounded-full bg-white px-3 py-1 text-xs text-gold-deep">
            {PREFERRED_LABEL}
          </p>
        )}
        <div className="mb-4 flex flex-col gap-1 text-sm">
          <RatingBadge rating={itemRating} subject={isService ? 'This service' : 'This product'} />
          <RatingBadge rating={sellerRating} subject="Supplier" />
        </div>
        <p className="mb-6 text-sm">
          {isService ? `${listing.durationMinutes} minutes` : `${listing.stock} in stock`} ·
          Sold by{' '}
          <Link to={`/supplier/${listing.sellerId}`} className="text-emerald-brand underline">
            {listing.sellerName}
          </Link>
          , {listing.city}{listing.province ? `, ${listing.province}` : ''}
        </p>
        <div className="mb-4">
          <FavouriteButton listingId={id} label />
        </div>
        {isService ? (
          isOwner ? (
            <p className="text-sm">This is your own service.</p>
          ) : (
            <Link
              to={user ? `/listing/${id}/book` : '/login'}
              className="inline-block rounded-full bg-emerald-brand px-8 py-3 text-cream"
            >
              {user ? 'Book now' : 'Log in to book'}
            </Link>
          )
        ) : isOwner ? (
          <p className="text-sm">This is your own product.</p>
        ) : !listing.stock || listing.stock < 1 ? (
          <p className="text-sm font-medium text-red-700">Out of stock</p>
        ) : (
          <Link
            to={user ? `/listing/${id}/buy` : '/login'}
            className="inline-block rounded-full bg-emerald-brand px-8 py-3 text-cream"
          >
            {user ? 'Buy now' : 'Log in to buy'}
          </Link>
        )}
        <p className="mt-4">
          <Link to="/shop" className="text-sm text-emerald-brand underline">← Back to shop</Link>
        </p>
      </div>
    </main>
  )
}