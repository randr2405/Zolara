import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import FavouriteButton from '../components/FavouriteButton.jsx'
import {
  mainCategories, subCategories, formatZAR, PREFERRED_LABEL, PROVINCES,
} from '../lib/constants.js'

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
]

const select = 'rounded-full border border-gold/50 bg-white px-4 py-2 text-sm'
const cityKey = (c) => String(c || '').trim().toLowerCase()

function toCents(value) {
  const n = parseFloat(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

export default function Shop() {
  const [params] = useSearchParams()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState(params.get('type') || 'all')
  const [category, setCategory] = useState(params.get('category') || '')
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || '')
  const [search, setSearch] = useState(params.get('q') || '')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState(params.get('max') || '')
  const [sort, setSort] = useState('featured')

  useEffect(() => {
    setType(params.get('type') || 'all')
    setCategory(params.get('category') || '')
    setSubcategory(params.get('subcategory') || '')
    setSearch(params.get('q') || '')
    setMaxPrice(params.get('max') || '')
  }, [params])

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'listings'),
        where('active', '==', true),
        where('sellerApproved', '==', true)
      )
    )
      .then((snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort(
          (a, b) =>
            (b.sellerPreferred ? 1 : 0) - (a.sellerPreferred ? 1 : 0) ||
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
        setListings(items)
      })
      .finally(() => setLoading(false))
  }, [])

  const mains = mainCategories(type)
  const subs = category ? subCategories(category, type) : []

  const cities = useMemo(() => {
    const map = new Map()
    listings
      .filter((l) => !province || l.province === province)
      .forEach((l) => {
        const key = cityKey(l.city)
        if (key && !map.has(key)) map.set(key, String(l.city).trim())
      })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [listings, province])

  const shown = useMemo(() => {
    const min = toCents(minPrice)
    const max = toCents(maxPrice)
    const needle = search.trim().toLowerCase()
    const items = listings.filter((l) =>
      (type === 'all' || l.type === type) &&
      (!category || l.category === category) &&
      (!subcategory || l.subcategory === subcategory) &&
      (!province || l.province === province) &&
      (!city || cityKey(l.city) === city) &&
      (min === null || l.priceCents >= min) &&
      (max === null || l.priceCents <= max) &&
      (!needle ||
        `${l.title} ${l.sellerName} ${l.category} ${l.subcategory} ${l.city}`.toLowerCase().includes(needle))
    )
    if (sort === 'newest') {
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    } else if (sort === 'price_asc') {
      items.sort((a, b) => a.priceCents - b.priceCents)
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.priceCents - a.priceCents)
    }
    return items
  }, [listings, type, category, subcategory, province, city, minPrice, maxPrice, search, sort])

  const filtered =
    type !== 'all' || category || subcategory || province || city || minPrice || maxPrice || search

  function clearAll() {
    setType('all')
    setCategory('')
    setSubcategory('')
    setProvince('')
    setCity('')
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setSort('featured')
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-emerald-brand">Shop local</h1>

      <div className="mb-3 flex flex-wrap gap-3">
        {[['all', 'Everything'], ['product', 'Products'], ['service', 'Services']].map(([v, label]) => (
          <button key={v} onClick={() => { setType(v); setCategory(''); setSubcategory('') }}
            className={`rounded-full px-4 py-2 text-sm ${
              type === v ? 'bg-emerald-brand text-cream' : 'border border-gold-deep text-gold-deep'}`}>
            {label}
          </button>
        ))}
        <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory('') }}
          className={select}>
          <option value="">All categories</option>
          {mains.map((c) => <option key={c}>{c}</option>)}
        </select>
        {category && (
          <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={select}>
            <option value="">All in {category}</option>
            {subs.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-gold/50 bg-white px-4 py-2 text-sm" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={province} onChange={(e) => { setProvince(e.target.value); setCity('') }}
          className={select}>
          <option value="">All provinces</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={select}>
          <option value="">All cities</option>
          {cities.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input type="number" min="0" inputMode="decimal" placeholder="Min R" value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)} className={`${select} w-24`} />
        <input type="number" min="0" inputMode="decimal" placeholder="Max R" value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)} className={`${select} w-24`} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={select}>
          {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        {filtered && (
          <button onClick={clearAll} className="text-sm text-gold-deep underline">Clear filters</button>
        )}
      </div>

      {loading && <p>Loading…</p>}
      {!loading && shown.length === 0 && (
        <p>{filtered ? 'Nothing matches these filters. Try widening them.' : 'Nothing here yet. Check back soon.'}</p>
      )}
      {!loading && shown.length > 0 && (
        <p className="mb-3 text-xs text-gold-deep">{shown.length} {shown.length === 1 ? 'result' : 'results'}</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((l) => (
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