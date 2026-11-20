import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG, formatZAR } from '../lib/constants.js'
import ListingCard from '../components/ListingCard.jsx'

const TRUST = [
  ['You pay after they accept', 'Nothing is charged until the supplier confirms your order or booking.'],
  ['Paid through PayFast', 'Your card and bank details are never seen or stored by Zolara.'],
  ['Suppliers are reviewed', 'Every business is checked before its listings go live.'],
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

function availability(cat) {
  const types = new Set(cat.subs.map((s) => s.type))
  if (types.size === 2) return 'Products and services'
  return types.has('product') ? 'Products' : 'Services'
}

function Wave({ flip = false }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none"
      className={`block h-14 w-full sm:h-24 ${flip ? 'rotate-180' : ''}`} aria-hidden="true">
      <path d="M0 70 C 240 10, 480 120, 760 70 S 1200 20, 1440 60 L1440 120 L0 120 Z" fill="#0B3D2E" />
      <path d="M0 70 C 240 10, 480 120, 760 70 S 1200 20, 1440 60" fill="none" stroke="#C9A24B"
        strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Section({ title, to, children }) {
  return (
    <section className="mx-auto mt-16 max-w-7xl px-4">
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-gold/50 pb-3">
        <h2 className="font-display text-4xl font-semibold text-emerald-brand">{title}</h2>
        <Link to={to} className="text-sm text-emerald-brand underline">See all</Link>
      </div>
      {children}
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

  const windows = [...products, ...services].filter((l) => l.thumb).sort(newest).slice(0, 3)
  const frames = [0, 1, 2].map((i) => windows[i] || null)

  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-6 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <h1 className="font-display text-7xl font-semibold leading-[0.9] text-emerald-brand sm:text-9xl">
              <Link to="/shop?type=product" className="block transition hover:text-gold-deep">Shop it.</Link>
              <Link to="/shop?type=service" className="block transition hover:text-gold-deep">Book it.</Link>
              <Link to="/shop" className="block transition hover:text-gold-deep">Love it.</Link>
            </h1>
            <p className="mt-8 max-w-md text-lg">
              A calm, trusted place to buy and book from local South Africans.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop?type=product" className="rounded-full bg-emerald-brand px-7 py-3 text-cream">Browse products</Link>
              <Link to="/shop?type=service" className="rounded-full border border-emerald-brand px-7 py-3 text-emerald-brand">Find a service</Link>
            </div>
          </div>

          <div className="grid grid-cols-3 items-end gap-3">
            {frames.map((l, i) => {
              const frame = (
                <>
                  <div className="aspect-[3/5] overflow-hidden rounded-t-full bg-emerald-brand ring-1 ring-gold">
                    {l && <img src={l.thumb} alt={l.title} className="h-full w-full object-cover" />}
                  </div>
                  {l && (
                    <>
                      <p className="mt-2 truncate text-sm">{l.title}</p>
                      <p className="font-display text-lg font-semibold text-emerald-brand">{formatZAR(l.priceCents)}</p>
                    </>
                  )}
                </>
              )
              const lift = i === 1 ? 'lg:-translate-y-8' : ''
              return l
                ? <Link key={l.id} to={`/listing/${l.id}`} className={lift}>{frame}</Link>
                : <div key={i} className={lift}>{frame}</div>
            })}
          </div>
        </div>
        <Wave />
      </section>

      <section className="bg-emerald-brand text-cream">
        <div className="mx-auto max-w-7xl px-4 pb-4">
          <h2 className="font-display text-4xl font-semibold text-gold">Departments</h2>
          <div className="mt-6 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((c) => (
              <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`}
                className="group flex items-baseline justify-between gap-3 border-b border-gold/30 py-3 transition hover:border-gold">
                <span className="font-display text-2xl group-hover:text-gold">{c.name}</span>
                <span className="shrink-0 text-xs text-cream/70">{availability(c)}</span>
              </Link>
            ))}
          </div>
        </div>
        <Wave flip />
      </section>

      <Section title="Just listed" to="/shop?type=product">
        {loading && <p className="text-sm">Loading…</p>}
        {!loading && products.length === 0 && <p className="text-sm">New products are on their way.</p>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </Section>

      <Section title="Ready to book" to="/shop?type=service">
        {loading && <p className="text-sm">Loading…</p>}
        {!loading && services.length === 0 && <p className="text-sm">New services are on their way.</p>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {services.slice(0, 4).map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </Section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-8 px-4 md:grid-cols-3">
        {TRUST.map(([title, text]) => (
          <div key={title} className="border-l-2 border-gold pl-4">
            <p className="font-display text-2xl font-semibold text-emerald-brand">{title}</p>
            <p className="mt-1 text-sm">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4">
        <div className="border-y border-gold py-12 text-center">
          <h2 className="font-display text-5xl font-semibold text-emerald-brand">Sell on Zolara</h2>
          <p className="mx-auto mt-3 max-w-xl">
            Get found and paid without building your own website. Your first 3 months are free, and we take no commission on your sales.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-emerald-brand px-7 py-3 text-cream">Start selling</Link>
            <Link to="/supplier-rules" className="rounded-full border border-emerald-brand px-7 py-3 text-emerald-brand">Read the supplier rules</Link>
          </div>
        </div>
      </section>
    </main>
  )
}