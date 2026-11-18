import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATEGORIES, formatZAR } from '../lib/constants.js'

export default function Shop() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'listings'), where('active', '==', true)))
      .then((snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setListings(items)
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = type === 'all'
    ? [...new Set([...CATEGORIES.product, ...CATEGORIES.service])]
    : CATEGORIES[type]

  const shown = listings.filter((l) =>
    (type === 'all' || l.type === type) &&
    (!category || l.category === category) &&
    (!search || `${l.title} ${l.sellerName}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-emerald-brand">Shop local</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        {[['all', 'Everything'], ['product', 'Products'], ['service', 'Services']].map(([v, label]) => (
          <button key={v} onClick={() => { setType(v); setCategory('') }}
            className={`rounded-full px-4 py-2 text-sm ${
              type === v ? 'bg-emerald-brand text-cream' : 'border border-gold-deep text-gold-deep'}`}>
            {label}
          </button>
        ))}
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-full border border-gold/50 bg-white px-4 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-gold/50 bg-white px-4 py-2 text-sm" />
      </div>

      {loading && <p>Loading…</p>}
      {!loading && shown.length === 0 && <p>Nothing here yet. Check back soon.</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((l) => (
          <Link key={l.id} to={`/listing/${l.id}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
            {l.thumb
              ? <img src={l.thumb} alt={l.title} className="aspect-square w-full object-cover" />
              : <div className="aspect-square w-full bg-cream" />}
            <div className="p-3">
              <p className="truncate font-medium">{l.title}</p>
              <p className="text-sm text-gold-deep">{formatZAR(l.priceCents)}</p>
              <p className="truncate text-xs">{l.sellerName} · {l.city}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}