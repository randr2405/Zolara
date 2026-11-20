import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG } from '../lib/constants.js'
import ListingCard from '../components/ListingCard.jsx'

const SLIDES = [
  { title: 'Shop it.', text: 'Products from local sellers, all in one calm place.', cta: 'Browse products', to: '/shop?type=product', bg: 'bg-emerald-brand', fg: 'text-cream', btn: 'bg-gold text-emerald-brand', art: 'text-gold' },
  { title: 'Book it.', text: 'Stylists, plumbers, tutors and more. Pay only after they accept.', cta: 'Find a service', to: '/shop?type=service', bg: 'bg-gold', fg: 'text-emerald-brand', btn: 'bg-emerald-brand text-cream', art: 'text-emerald-brand' },
  { title: 'List it.', text: 'Your first 3 months are free, and we take no commission on your sales.', cta: 'Start selling', to: '/signup', bg: 'bg-white', fg: 'text-emerald-brand', btn: 'bg-emerald-brand text-cream', art: 'text-gold' },
]

const POPULAR = [
  'Hair styling', 'Plumbing', 'Skincare', 'Car wash & detailing', 'Baked goods',
  'Photography', 'Tutoring', 'Cleaning', 'Furniture', 'Phones & accessories',
]

const SUB_TO_CAT = Object.fromEntries(CATALOG.flatMap((c) => c.subs.map((s) => [s.name, c.name])))

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

function Banner() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [paused])

  const go = (n) => setI((n + SLIDES.length) % SLIDES.length)

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl ring-1 ring-gold/60 lg:h-[26rem]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {SLIDES.map((s, n) => (
        <div key={s.title} aria-hidden={n !== i}
          className={`absolute inset-0 flex items-center p-8 transition-opacity duration-700 sm:p-12 ${s.bg} ${s.fg} ${
            n === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <svg viewBox="0 0 400 400" className={`pointer-events-none absolute right-0 top-0 h-full w-3/5 ${s.art}`} aria-hidden="true">
            <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.9" />
            <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.35" />
          </svg>
          <div className="relative max-w-md">
            <h2 className="font-display text-6xl font-semibold leading-none sm:text-7xl">{s.title}</h2>
            <p className="mt-3 text-base sm:text-lg">{s.text}</p>
            <Link to={s.to} tabIndex={n === i ? 0 : -1} className={`mt-5 inline-block rounded-full px-7 py-3 font-medium ${s.btn}`}>{s.cta}</Link>
          </div>
        </div>
      ))}
      <button onClick={() => go(i - 1)} aria-label="Previous slide"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand">‹</button>
      <button onClick={() => go(i + 1)} aria-label="Next slide"
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand">›</button>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, n) => (
          <button key={s.title} onClick={() => setI(n)} aria-label={`Show slide ${n + 1}`}
            className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-gold-deep' : 'w-2 bg-charcoal/40'}`} />
        ))}
      </div>
    </div>
  )
}

function SideTiles() {
  return (
    <>
      <Link to="/shop" className="flex flex-1 flex-col justify-end rounded-2xl bg-cream p-5 ring-1 ring-gold/60">
        <span className="font-display text-2xl font-semibold leading-tight text-emerald-brand">Founder and preferred suppliers</span>
        <span className="mt-1 text-sm">Shown first, on the same terms as everyone.</span>
      </Link>
      <Link to="/supplier-rules" className="flex flex-1 flex-col justify-end rounded-2xl bg-emerald-brand p-5 text-cream">
        <span className="font-display text-2xl font-semibold leading-tight text-gold">Sell on Zolara</span>
        <span className="mt-1 text-sm">3 months free. No commission.</span>
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
        <div ref={scroller} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
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

  const under = products
    .filter((l) => l.priceCents <= 25000 && l.stock > 0)
    .sort((a, b) => a.priceCents - b.priceCents)
  const almost = products.filter((l) => l.stock > 0 && l.stock <= 3)
  const preferred = [...products, ...services].filter((l) => l.sellerPreferred).sort(newest)

  return (
    <main className="pb-6">
      <section className="mx-auto grid max-w-7xl gap-3 px-4 pt-4 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_16rem]">
        <nav aria-label="Departments" className="hidden overflow-y-auto rounded-2xl bg-white p-2 ring-1 ring-gold/40 lg:block lg:h-[26rem]">
          <p className="px-3 py-2 font-display text-xl font-semibold text-emerald-brand">Departments</p>
          {CATALOG.map((c) => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-cream hover:text-emerald-brand">
              {c.name}
              <span className="text-gold-deep" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
        <Banner />
        <div className="hidden flex-col gap-3 xl:flex xl:h-[26rem]"><SideTiles /></div>
        <div className="grid h-36 grid-cols-2 gap-3 xl:hidden lg:col-span-2"><SideTiles /></div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {POPULAR.map((s) => (
            <Link key={s}
              to={`/shop?category=${encodeURIComponent(SUB_TO_CAT[s])}&subcategory=${encodeURIComponent(s)}`}
              className="whitespace-nowrap rounded-full border border-gold-deep bg-white px-4 py-1.5 text-sm text-emerald-brand hover:bg-emerald-brand hover:text-cream">
              {s}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-px overflow-hidden border-y border-gold/40 bg-gold/30 px-0 md:grid-cols-4">
        {TRUST.map(([title, text]) => (
          <div key={title} className="bg-white px-4 py-3">
            <p className="text-sm font-semibold text-emerald-brand">{title}</p>
            <p className="text-xs">{text}</p>
          </div>
        ))}
      </section>

      <Rail title="New arrivals" to="/shop?type=product" items={products} loading={loading} />
      <Rail title="Great under R250" to="/shop?type=product" items={under} loading={false} />
      <Rail title="Almost gone" to="/shop?type=product" items={almost} loading={false} />
      <Rail title="Book a local service" to="/shop?type=service" items={services} loading={loading} />
      <Rail title="Founder and preferred suppliers" to="/shop" items={preferred} loading={false} />

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <Title>Shop by department</Title>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {CATALOG.map((c) => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`}
              className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-gold/40 transition hover:ring-2 hover:ring-emerald-brand">
              <span className="font-display text-xl font-semibold leading-tight text-emerald-brand">{c.name}</span>
              <span className="text-xs">{c.subs.slice(0, 3).map((s) => s.name).join(', ')} and more</span>
              <span className="mt-auto w-fit bg-gold py-0.5 pl-3 pr-2 text-xs font-medium text-emerald-brand [clip-path:polygon(0_50%,8px_0,100%_0,100%_100%,8px_100%)]">
                {availability(c)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-brand p-8 text-cream sm:p-12">
          <svg viewBox="0 0 400 400" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 text-gold" aria-hidden="true">
            <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.5" />
          </svg>
          <div className="relative max-w-xl">
            <h2 className="font-display text-4xl font-semibold text-gold">List it on Zolara</h2>
            <p className="mt-2">
              Get found and paid without building your own website. Your first 3 months are free, and we take no commission on your sales.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-full bg-gold px-7 py-3 font-medium text-emerald-brand">Start selling</Link>
              <Link to="/supplier-rules" className="rounded-full border border-gold px-7 py-3 font-medium text-gold">Read the supplier rules</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}