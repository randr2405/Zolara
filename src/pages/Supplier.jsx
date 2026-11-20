import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'
import { MIN_REVIEWS, summarize } from '../lib/ratings.js'
import RatingBadge from '../components/RatingBadge.jsx'

const statusOf = (s) => s.status || (s.verified ? 'approved' : 'pending')

export default function Supplier() {
  const { id } = useParams()
  const [seller, setSeller] = useState(undefined)
  const [listings, setListings] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let alive = true
    setSeller(undefined)
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

  if (seller === undefined) return <p className="p-6 text-center">Loading…</p>
  if (seller === null) return <p className="p-6 text-center">This supplier isn’t available.</p>

  const rating = summarize(reviews)

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {seller.logoUrl
          ? <img src={seller.logoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          : <div className="h-20 w-20 rounded-full bg-white" />}
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-emerald-brand">{seller.businessName}</h1>
          <p className="text-sm">{seller.city}</p>
          {seller.preferred && (
            <p className="mt-1 inline-block rounded-full bg-white px-3 py-1 text-xs text-gold-deep">
              {PREFERRED_LABEL}
            </p>
          )}
        </div>
        <RatingBadge rating={rating} large />
      </div>

      {seller.description && <p className="mb-8 max-w-2xl whitespace-pre-line">{seller.description}</p>}

      <h2 className="mb-3 text-lg font-semibold text-emerald-brand">Products and services</h2>
      {listings.length === 0 && <p className="text-sm">Nothing listed right now.</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => (
          <Link key={l.id} to={`/listing/${l.id}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
            {l.thumb
              ? <img src={l.thumb} alt={l.title} className="aspect-square w-full object-cover" />
              : <div className="aspect-square w-full bg-cream" />}
            <div className="p-3">
              <p className="truncate font-medium">{l.title}</p>
              <p className="text-sm text-gold-deep">{formatZAR(l.priceCents)}</p>
              <p className="truncate text-xs">{l.type === 'service' ? 'Service' : 'Product'} · {l.category}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs">
        After every completed service or delivered order, we ask the customer whether they were satisfied.
        The score shows once a supplier has at least {MIN_REVIEWS} reviews.
      </p>
      <p className="mt-4">
        <Link to="/shop" className="text-sm text-emerald-brand underline">← Back to shop</Link>
      </p>
    </main>
  )
}