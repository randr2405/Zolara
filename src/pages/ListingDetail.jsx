import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatZAR } from '../lib/constants.js'

export default function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState(undefined)
  const [photos, setPhotos] = useState([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const s = await getDoc(doc(db, 'listings', id))
        if (!s.exists()) return setListing(null)
        setListing(s.data())
        const ph = await getDocs(query(collection(db, 'listings', id, 'photos'), orderBy('order')))
        setPhotos(ph.docs.map((p) => p.data().data))
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
        <p className="text-sm text-gold-deep">{isService ? 'Service' : 'Product'} · {listing.category}</p>
        <h1 className="mb-2 text-3xl font-semibold text-emerald-brand">{listing.title}</h1>
        <p className="mb-4 text-2xl">{formatZAR(listing.priceCents)}</p>
        <p className="mb-4 whitespace-pre-line">{listing.description}</p>
        <p className="mb-6 text-sm">
          {isService ? `${listing.durationMinutes} minutes` : `${listing.stock} in stock`} ·
          Sold by {listing.sellerName}, {listing.city}
        </p>
        <button disabled className="rounded-full bg-emerald-brand px-8 py-3 text-cream opacity-60">
          {isService ? 'Book now' : 'Buy now'} (coming soon)
        </button>
        <p className="mt-4">
          <Link to="/shop" className="text-sm text-emerald-brand underline">← Back to shop</Link>
        </p>
      </div>
    </main>
  )
}