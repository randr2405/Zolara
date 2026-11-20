import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG, formatZAR } from '../lib/constants.js'
import ListingCard from '../components/ListingCard.jsx'

const SLIDES = [
  {
    title: 'Shop it.', text: 'Products from local sellers, all in one calm place.',
    cta: 'Browse products', to: '/shop?type=product', kind: 'product',
    bg: 'from-emerald-brand to-emerald-brand', fg: 'text-cream', btn: 'bg-gold text-emerald-brand',
    art: 'text-gold', glow: 'bg-gold/30',
  },
  {
    title: 'Book it.', text: 'Stylists, plumbers, tutors and more. You pay only after they accept.',
    cta: 'Find a service', to: '/shop?type=service', kind: 'service',
    bg: 'from-gold to-gold', fg: 'text-emerald-brand', btn: 'bg-emerald-brand text-cream',
    art: 'text-emerald-brand', glow: 'bg-cream/50',
  },
]

const POPULAR = [
  'Hair styling', 'Plumbing', 'Skincare', 'Car wash & detailing', 'Baked goods',
  'Photography', 'Tutoring', 'Cleaning', 'Furniture', 'Phones & accessories',
]

const SUB_TO_CAT = Object.fromEntries(CATALOG.flatMap((c) => c.subs.map((s) => [s.name, c.name])))
const enc = encodeURIComponent

const TRUST = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.'],
  ['Secure PayFast checkout', 'We never see or store your card details.'],
  ['Reviewed suppliers', 'Every business is checked before going live.'],
  ['Local, every time', 'South African businesses only.'],
]

const newest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)

async function load(type) {
  const snap = await getDocs(
    query(
      collection(db, 'listings'),
      where('active', '==', true),
      where('sellerApproved', '==', true),
      where('type', '==', type),
      limit(30)
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newest)
}

function availability(cat) {
  const types = new Set(cat.subs.map((s) => s.type))
  if (types.size === 2) return 'Products and services'
  return types.has('product') ? 'Products' : 'Services'
}

function Tag({ children, className = '' }) {
  return (
    <span className={`relative inline-block bg-gold py-1 pl-5 pr-3 font-bold text-emerald-brand [clip-path:polygon(0_50%,10px_0,100%_0,100%_100%,10px_100%)] ${className}`}>
      <i className="absolute left-[7px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
      {children}
    </span>
  )
}

function Floating({ items }) {
  const spots = ['right-2 top-6 rotate-6', 'right-28 top-28 -rotate-6 lg:right-32', 'right-4 bottom-4 rotate-3']
  if (items.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-y-0 right-6 hidden w-72 md:block">
      {items.slice(0, 3).map((l, i) => (
        <Link key={l.id} to={`/listing/${l.id}`} tabIndex={-1}
          className={`pointer-events-auto absolute w-32 transition hover:z-10 hover:scale-105 ${spots[i]}`}>
          <img src={l.thumb} alt={l.title} className="aspect-square w-full rounded-xl object-cover shadow-2xl ring-4 ring-white" />
          <Tag className="absolute -bottom-2 left-2 text-xs">{formatZAR(l.priceCents)}</Tag>
        </Link>
      ))}
    </div>
  )
}

function Banner({ pics }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6500)
    return () => clearInterval(t)
  }, [paused])

  const go = (n) => setI((n + SLIDES.length) % SLIDES.length)

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl shadow-lg ring-1 ring-gold/60 lg:h-[26rem]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {SLIDES.map((s, n) => (
        <div key={s.title} aria-hidden={n !== i}
          className={`absolute inset-0 flex items-center bg-gradient-to-br p-8 transition-opacity duration-700 sm:p-12 ${s.bg} ${s.fg} ${
            n === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <div className={`pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full blur-3xl ${s.glow}`} />
          <svg viewBox="0 0 400 400" className={`pointer-events-none absolute right-0 top-0 h-full w-3/5 ${s.art}`} aria-hidden="true">
            <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.85" />
            <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.35" />
          </svg>
          <Floating items={pics[s.kind]} />
          <div className="relative max-w-sm">
            <h2 className="font-display text-6xl font-semibold leading-none sm:text-7xl">{s.title}</h2>
            <p className="mt-3 text-base sm:text-lg">{s.text}</p>
            <Link to={s.to} tabIndex={n === i ? 0 : -1}
              className={`mt-5 inline-block rounded-full px-7 py-3 font-medium shadow-md transition hover:-translate-y-0.5 ${s.btn}`}>
              {s.cta}
            </Link>
          </div>
        </div>
      ))}
      <button onClick={() => go(i - 1)} aria-label="Previous slide"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand shadow">‹</button>
      <button onClick={() => go(i + 1)} aria-label="Next slide"
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand shadow">›</button>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, n) => (
          <button key={s.title} onClick={() => setI(n)} aria-label={`Show slide ${n + 1}`}
            className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />
        ))}
      </div>
    </div>
  )
}

function SideTiles() {
  return (
    <>
      <Link to="/shop?type=product&max=250"
        className="group flex flex-1 flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gold/60 transition hover:-translate-y-1 hover:shadow-lg">
        <Tag className="w-fit text-xl">Under R250</Tag>
        <span>
          <span className="block font-display text-2xl font-semibold leading-tight text-emerald-brand">Small price, local made</span>
          <span className="text-sm">Shop the best finds under R250.</span>
        </span>
      </Link>
      <Link to="/shop"
        className="group flex flex-1 flex-col justify-end rounded-2xl bg-emerald-brand p-5 text-cream shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <span className="font-display text-2xl font-semibold leading-tight text-gold">Founder and preferred suppliers</span>
        <span className="mt-1 text-sm">Shown first, and held to the same rules as everyone.</span>
      </Link>
    </>
  )
}

function Title({ children, to }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="bg-emerald-brand py-2 pl-5 pr-10 font-display text-2xl font-semibold text-cream [clip-path:polygon(0_0,100%_0,calc(100%_-_20px)_100%,0_100%)]">
        {children}
      </h2>
      <span className="h-0.5 flex-1 bg-gold" />
      {to && <Link to={to} className="shrink-0 text-sm font-medium text-emerald-brand underline">See all</Link>}
    </div>
  )
}

function Rail({ title, to, items, loading }) {
  const scroller = useRef(null)
  if (!loading && items.length === 0) return null

  const by = (dir) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4">
      <Title to={to}>{title}</Title>
      <div className="relative">
        <button onClick={() => by(-1)} aria-label="Scroll left"
          className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-emerald-brand shadow ring-1 ring-gold/50 md:flex">‹</button>
        <div ref={scroller} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 w-44 shrink-0 animate-pulse rounded-xl bg-white sm:w-52" />
              ))
            : items.slice(0, 12).map((l) => (
                <ListingCard key={l.id} listing={l} className="w-44 shrink-0 snap-start sm:w-52" />
              ))}
        </div>
        <button onClick={() => by(1)} aria-label="Scroll right"
          className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-emerald-brand shadow ring-1 ring-gold/50 md:flex">›</button>
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

  const all = [...products, ...services].sort(newest)
  const pics = {
    product: products.filter((l) => l.thumb),
    service: services.filter((l) => l.thumb),
  }
  const under = products
    .filter((l) => l.priceCents <= 25000 && l.stock > 0)
    .sort((a, b) => a.priceCents - b.priceCents)
  const almost = products.filter((l) => l.stock > 0 && l.stock <= 3)
  const preferred = all.filter((l) => l.sellerPreferred)
  const deptPic = {}
  all.forEach((l) => {
    if (l.thumb && !deptPic[l.category]) deptPic[l.category] = l.thumb
  })

  return (
    <main className="pb-6">
      <section className="mx-auto grid max-w-7xl gap-3 px-4 pt-4 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_16rem]">
        <nav aria-label="Departments" className="hidden overflow-y-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gold/40 lg:block lg:h-[26rem]">
          <p className="px-3 py-2 font-display text-xl font-semibold text-emerald-brand">Departments</p>
          {CATALOG.map((c) => (
            <Link key={c.name} to={`/shop?category=${enc(c.name)}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-cream hover:pl-4 hover:text-emerald-brand">
              {c.name}
              <span className="text-gold-deep" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
        <Banner pics={pics} />
        <div className="hidden flex-col gap-3 xl:flex xl:h-[26rem]"><SideTiles /></div>
        <div className="grid h-40 grid-cols-2 gap-3 xl:hidden lg:col-span-2"><SideTiles /></div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {POPULAR.map((s) => (
            <Link key={s} to={`/shop?category=${enc(SUB_TO_CAT[s])}&subcategory=${enc(s)}`}
              className="whitespace-nowrap rounded-full border border-gold-deep bg-white px-4 py-1.5 text-sm text-emerald-brand transition hover:-translate-y-0.5 hover:bg-emerald-brand hover:text-cream">
              {s}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-px overflow-hidden border-y border-gold/40 bg-gold/30 md:grid-cols-4">
        {TRUST.map(([title, text]) => (
          <div key={title} className="bg-white px-4 py-3">
            <p className="text-sm font-semibold text-emerald-brand">{title}</p>
            <p className="text-xs">{text}</p>
          </div>
        ))}
      </section>

      {!loading && all.length === 0 && (
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-2xl border border-dashed border-gold-deep bg-white p-10 text-center">
            <p className="font-display text-3xl font-semibold text-emerald-brand">Our first local suppliers are joining</p>
            <p className="mt-2 text-sm">New products and services will appear here soon. Browse the departments below in the meantime.</p>
          </div>
        </section>
      )}

      <Rail title="New arrivals" to="/shop?type=product" items={products} loading={loading} />
      <Rail title="Great under R250" to="/shop?type=product&max=250" items={under} loading={false} />
      <Rail title="Almost gone" to="/shop?type=product" items={almost} loading={false} />
      <Rail title="Book a local service" to="/shop?type=service" items={services} loading={loading} />
      <Rail title="Founder and preferred suppliers" to="/shop" items={preferred} loading={false} />

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <Title>Shop by department</Title>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {CATALOG.map((c) => {
            const pic = deptPic[c.name]
            return (
              <Link key={c.name} to={`/shop?category=${enc(c.name)}`}
                className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-xl bg-emerald-brand p-4 text-cream shadow-sm ring-1 ring-gold/50 transition hover:-translate-y-1 hover:shadow-xl">
                {pic ? (
                  <img src={pic} alt="" loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                ) : (
                  <svg viewBox="0 0 400 400" className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-gold opacity-60" aria-hidden="true">
                    <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" />
                  </svg>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-emerald-brand via-emerald-brand/60 to-emerald-brand/10" />
                <span className="absolute left-0 top-3 bg-gold py-0.5 pl-2 pr-4 text-xs font-medium text-emerald-brand [clip-path:polygon(0_0,100%_0,calc(100%_-_10px)_100%,0_100%)]">
                  {availability(c)}
                </span>
                <span className="relative font-display text-2xl font-semibold leading-tight">{c.name}</span>
                <span className="relative truncate text-xs text-cream/80">{c.subs.slice(0, 3).map((s) => s.name).join(', ')}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}