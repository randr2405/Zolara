import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG } from '../lib/constants.js'
import ListingCard from '../components/ListingCard.jsx'

const ICONS = {
  'Automotive': '🚗',
  'Beauty & Hair': '💇',
  'Clothing': '👗',
  'Food & Drink': '🍞',
  'Home & Living': '🏡',
  'Electronics': '📱',
  'IT & Digital Services': '💻',
  'Printing, Embroidery & Branding': '🖨️',
  'Events': '🎉',
  'Photography & Video': '📷',
  'Gifts': '🎁',
  'Education': '📚',
  'Pets': '🐾',
  'Other': '✨',
}

const TRUST = [
  ['Pay only after they accept', 'No money moves until the supplier confirms your order or booking.'],
  ['Secure PayFast checkout', 'Card and bank details never touch Zolara.'],
  ['Reviewed suppliers', 'Every supplier is checked before their listings go live.'],
  ['Local, every time', 'South African businesses, in your province and beyond.'],
]

const newest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)

async function load(type) {
  const snap = await getDocs(
    query(
      collection(db, 'listings'),
      where('active', '==', true),
      where('sellerApproved', '==', true),
      where('type', '==', type),
      limit(24)
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newest)
}

function Rail({ title, subtitle, to, items, loading }) {
  if (!loading && items.length === 0) return null
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-emerald-brand">{title}</h2>
          {subtitle && <p className="text-sm text-gold-deep">{subtitle}</p>}
        </div>
        <Link to={to} className="shrink-0 text-sm font-medium text-emerald-brand underline">See all</Link>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 w-44 shrink-0 animate-pulse rounded-lg bg-white sm:w-52" />
            ))
          : items.slice(0, 12).map((l) => (
              <ListingCard key={l.id} listing={l} className="w-44 shrink-0 snap-start sm:w-52" />
            ))}
      </div>
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([load('product').catch(() => []), load('service').catch(() => [])]).then(([p, s]) => {
      if (!alive) return
      setProducts(p)
      setServices(s)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const preferred = [...products, ...services].filter((l) => l.sellerPreferred).sort(newest)

  return (
    <main className="pb-6">
      <section className="mx-auto grid max-w-7xl gap-3 px-4 pt-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-brand p-8 text-cream lg:col-span-2 lg:p-12">
          <svg viewBox="0 0 400 300" className="pointer-events-none absolute -right-10 -top-6 h-full w-3/5 opacity-30" aria-hidden="true">
            <path d="M0 260 C 120 240, 200 150, 400 40 C 300 170, 180 290, 0 300 Z" fill="#C9A24B" />
            <path d="M40 300 C 160 270, 260 200, 400 150 C 320 250, 200 310, 40 300 Z" fill="#FAF6EE" opacity="0.4" />
          </svg>
          <div className="relative max-w-lg">
            <p className="mb-3 text-sm text-gold">Support local businesses, don’t kill them.</p>
            <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">Shop it. Book it. Love it.</h1>
            <p className="mt-4 text-base text-cream/90">
              One calm, trusted place to buy products and book services from local South Africans.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop?type=product" className="rounded-full bg-gold px-6 py-3 font-medium text-emerald-brand">Shop products</Link>
              <Link to="/shop?type=service" className="rounded-full border border-gold px-6 py-3 font-medium text-gold">Book a service</Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Link to="/shop?type=product" className="flex flex-col justify-between rounded-2xl border border-gold/50 bg-white p-5">
            <span className="text-3xl" aria-hidden="true">🛍️</span>
            <span>
              <span className="block font-serif text-xl font-semibold text-emerald-brand">Shop it</span>
              <span className="text-sm">Products from local sellers</span>
            </span>
          </Link>
          <Link to="/shop?type=service" className="flex flex-col justify-between rounded-2xl border border-gold/50 bg-white p-5">
            <span className="text-3xl" aria-hidden="true">📅</span>
            <span>
              <span className="block font-serif text-xl font-semibold text-emerald-brand">Book it</span>
              <span className="text-sm">Trusted local service providers</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-emerald-brand">Shop by category</h2>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible lg:grid-cols-7">
          {CATALOG.map((c) => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2 text-center sm:w-auto">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl ring-2 ring-gold/40">
                {ICONS[c.name] || '✨'}
              </span>
              <span className="text-xs font-medium leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <Rail title="New products" subtitle="Fresh from local sellers" to="/shop?type=product" items={products} loading={loading} />
      <Rail title="Book a local service" subtitle="Reliable people near you" to="/shop?type=service" items={services} loading={loading} />
      {!loading && preferred.length > 0 && (
        <Rail title="Founder and preferred suppliers" to="/shop" items={preferred} loading={false} />
      )}

      <section className="mx-auto mt-10 grid max-w-7xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map(([title, text]) => (
          <div key={title} className="rounded-xl border border-gold/40 bg-white p-4">
            <p className="font-medium text-emerald-brand">{title}</p>
            <p className="mt-1 text-sm">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-emerald-brand p-8 text-cream sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl font-semibold">List it on Zolara</h2>
            <p className="mt-1 max-w-xl text-sm text-cream/90">
              Get found and paid without building your own website. Your first 3 months are free, and we take no commission on your sales.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-full bg-gold px-6 py-3 font-medium text-emerald-brand">Start selling</Link>
            <Link to="/supplier-rules" className="rounded-full border border-gold px-6 py-3 font-medium text-gold">Read the supplier rules</Link>
          </div>
        </div>
      </section>
    </main>
  )
}