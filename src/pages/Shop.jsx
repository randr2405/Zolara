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

const TYPES = [
  ['all', 'Everything'],
  ['product', 'Products'],
  ['service', 'Services'],
]

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`

const fieldClass =
  'min-h-[48px] w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold'

const ICONS = {
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  sliders: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 5v4 M6 15v4',
  close: 'M6 6l12 12 M18 6L6 18',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
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

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-emerald-brand">
        {label}
      </label>
      {children}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading listings"
    >
      {Array.from({ length: 8 }).map((_, i) => (
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

const cityKey = (c) => String(c || '').trim().toLowerCase()

function toCents(value) {
  const n = parseFloat(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

export default function Shop() {
  const [params] = useSearchParams()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
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
      .catch((err) => {
        console.error(err)
        setLoadError('Could not load the shop. Please refresh and try again.')
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

  const panelCount = [category, subcategory, province, city, minPrice, maxPrice].filter(Boolean).length

  const cityLabel = (cities.find(([k]) => k === city) || [])[1] || city

  const chips = [
    category && ['Category', category, () => { setCategory(''); setSubcategory('') }],
    subcategory && ['Sub-category', subcategory, () => setSubcategory('')],
    province && ['Province', province, () => { setProvince(''); setCity('') }],
    city && ['City', cityLabel, () => setCity('')],
    minPrice && ['Min', `R${minPrice}`, () => setMinPrice('')],
    maxPrice && ['Max', `R${maxPrice}`, () => setMaxPrice('')],
  ].filter(Boolean)

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
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Shop local</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Products and services from approved local suppliers.
          </p>
          <div className="relative mt-5 max-w-2xl">
            <label htmlFor="shop-search" className="sr-only">Search products and services</label>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gold-deep">
              <Icon name="search" />
            </span>
            <input
              id="shop-search"
              type="search"
              placeholder="Search products, services or suppliers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[52px] w-full rounded-full border border-transparent bg-white py-3 pl-11 pr-4 text-base text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div
          className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          role="group"
          aria-label="Listing type"
        >
          {TYPES.map(([v, label]) => (
            <button
              key={v}
              onClick={() => { setType(v); setCategory(''); setSubcategory('') }}
              aria-pressed={type === v}
              className={`inline-flex min-h-[44px] flex-none items-center whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                type === v
                  ? 'bg-emerald-brand text-cream'
                  : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="shop-filters"
            className={`${btn} gap-2 border border-gold-deep bg-white text-gold-deep hover:bg-cream`}
          >
            <Icon name="sliders" />
            Filters
            {panelCount > 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-emerald-brand">
                {panelCount}
              </span>
            )}
          </button>
          <div className="ml-auto">
            <label htmlFor="shop-sort" className="sr-only">Sort by</label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-[44px] rounded-full border border-gold/50 bg-white px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
        </div>

        {showFilters && (
          <div id="shop-filters" className="mb-4 rounded-2xl border border-gold/40 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Category" htmlFor="f-category">
                <select
                  id="f-category"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setSubcategory('') }}
                  className={fieldClass}
                >
                  <option value="">All categories</option>
                  {mains.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              {category && (
                <Field label="Sub-category" htmlFor="f-sub">
                  <select
                    id="f-sub"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">All in {category}</option>
                    {subs.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Province" htmlFor="f-province">
                <select
                  id="f-province"
                  value={province}
                  onChange={(e) => { setProvince(e.target.value); setCity('') }}
                  className={fieldClass}
                >
                  <option value="">All provinces</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="City" htmlFor="f-city">
                <select id="f-city" value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass}>
                  <option value="">All cities</option>
                  {cities.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium text-emerald-brand">Price range (R)</p>
                <div className="flex items-center gap-2">
                  <label htmlFor="f-min" className="sr-only">Minimum price in rand</label>
                  <input
                    id="f-min"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className={fieldClass}
                  />
                  <span className="text-gold-deep" aria-hidden="true">–</span>
                  <label htmlFor="f-max" className="sr-only">Maximum price in rand</label>
                  <input
                    id="f-max"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
            {filtered && (
              <button
                onClick={clearAll}
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-gold-deep underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {chips.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map(([label, value, remove]) => (
              <li key={`${label}-${value}`}>
                <button
                  onClick={remove}
                  aria-label={`Remove ${label} filter: ${value}`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-brand ring-1 ring-gold/60 transition hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span className="text-gold-deep">{label}:</span>
                  {value}
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {loadError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </p>
        )}

        {loading && <SkeletonGrid />}

        {!loading && !loadError && shown.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream text-gold-deep">
              <Icon name="search" size={26} />
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-emerald-brand">
              {filtered ? 'Nothing matches these filters' : 'Nothing here yet'}
            </p>
            <p className="mt-2 text-sm text-charcoal/70">
              {filtered ? 'Try widening your search or removing a filter.' : 'Check back soon.'}
            </p>
            {filtered && (
              <button onClick={clearAll} className={`${btnPrimary} mt-5`}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!loading && shown.length > 0 && (
          <p role="status" className="mb-3 text-sm text-gold-deep">
            {shown.length} {shown.length === 1 ? 'result' : 'results'}
          </p>
        )}

        {!loading && shown.length > 0 && (
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
                      <Icon name="heart" size={36} />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-emerald-brand px-2.5 py-0.5 text-[11px] font-medium text-cream">
                      {l.type === 'service' ? 'Service' : 'Product'}
                    </span>
                    {l.sellerPreferred && (
                      <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-medium text-gold-deep ring-1 ring-gold/60">
                        {PREFERRED_LABEL}
                      </span>
                    )}
                  </div>
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