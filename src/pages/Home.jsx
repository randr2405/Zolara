import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG, formatZAR } from '../lib/constants.js'
import useScrollProgress from '../lib/useScrollProgress.js'
import ListingCard from '../components/ListingCard.jsx'
import Reveal from '../components/Reveal.jsx'
import logo from '../assets/zolara-logo.png'

const TRAVEL = 2800

const SLOTS = [
  { x: -30, y: -20, z: -300, w: 260, r: -7 },
  { x: 28, y: -22, z: -700, w: 300, r: 6 },
  { x: -18, y: 22, z: -1000, w: 280, r: 4 },
  { x: 34, y: 18, z: -1300, w: 250, r: -6 },
  { x: -34, y: -2, z: -1600, w: 300, r: 8 },
  { x: 8, y: -10, z: -1900, w: 320, r: -3 },
  { x: 24, y: 26, z: -2200, w: 260, r: 7 },
  { x: -8, y: 28, z: -2500, w: 280, r: -5 },
]

const BRANDS = [
  { k: 'logo' },
  { k: 'swoosh' },
  { k: 'word', text: 'Local', bg: 'bg-gold', fg: 'text-emerald-brand' },
  { k: 'word', text: 'Trusted', bg: 'bg-cream', fg: 'text-emerald-brand' },
  { k: 'word', text: 'Calm', bg: 'bg-emerald-brand', fg: 'text-gold' },
  { k: 'swoosh' },
]

const LINES = [
  ['Shop it.', '/shop?type=product', 0.04],
  ['Book it.', '/shop?type=service', 0.16],
  ['Love it.', '/shop', 0.28],
]

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

function Swoosh() {
  return (
    <svg viewBox="0 0 200 250" className="h-full w-full" aria-hidden="true">
      <path d="M0 200 C 60 190, 120 120, 200 40 C 150 150, 80 230, 0 250 Z" fill="#C9A24B" />
      <path d="M0 120 C 50 110, 110 70, 200 0 C 140 90, 70 140, 0 160 Z" fill="#FAF6EE" opacity="0.35" />
    </svg>
  )
}

function Panel({ slot, brand, listing }) {
  const style = {
    '--x': slot.x,
    '--y': slot.y,
    '--z': slot.z,
    width: `min(${slot.w}px, 42vw)`,
    transform: `translate3d(-50%, -50%, 0) translate3d(calc(var(--x) * 1vw), calc(var(--y) * 1vh), calc(var(--z) * 1px)) rotate(${slot.r}deg)`,
    opacity: `min(clamp(0, calc((2600 + var(--z) + var(--p) * ${TRAVEL}) / 900), 1), clamp(0, calc((800 - var(--z) - var(--p) * ${TRAVEL}) / 500), 1))`,
  }

  let body
  if (listing) {
    body = (
      <>
        <img src={listing.thumb} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-brand/90 to-transparent p-4 pt-12 text-cream">
          <p className="truncate text-sm">{listing.title}</p>
          <p className="font-display text-xl font-semibold text-gold">{formatZAR(listing.priceCents)}</p>
        </div>
      </>
    )
  } else if (brand.k === 'logo') {
    body = <div className="flex h-full items-center justify-center bg-white p-6"><img src={logo} alt="" className="w-full" /></div>
  } else if (brand.k === 'swoosh') {
    body = <div className="h-full bg-emerald-brand"><Swoosh /></div>
  } else {
    body = (
      <div className={`flex h-full items-end p-5 ${brand.bg}`}>
        <p className={`font-display text-5xl font-semibold ${brand.fg}`}>{brand.text}</p>
      </div>
    )
  }

  return (
    <div style={style} aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-gold/60">
      {body}
    </div>
  )
}

function Hero({ listings }) {
  const ref = useRef(null)
  useScrollProgress(ref)

  const withImages = listings.filter((l) => l.thumb)
  let li = 0
  let bi = 0
  const panels = SLOTS.map((slot, i) => {
    if (i % 2 === 0 && withImages[li]) return { slot, listing: withImages[li++], brand: null }
    return { slot, listing: null, brand: BRANDS[bi++ % BRANDS.length] }
  })

  return (
    <section ref={ref} className="relative bg-cream" style={{ height: '340vh', '--p': 0 }}>
      <div className="pin-stage sticky top-0 h-screen overflow-hidden" style={{ perspective: '1200px' }}>
        <div className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateZ(calc(var(--p) * ${TRAVEL}px)) rotateY(calc((var(--p) - 0.5) * 12deg))`,
          }}>
          {panels.map((p, i) => <Panel key={i} slot={p.slot} brand={p.brand} listing={p.listing} />)}
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 pt-16"
          style={{
            opacity: 'clamp(0, calc((0.8 - var(--p)) * 8), 1)',
            transform: 'scale(calc(1 + var(--p) * 0.15))',
            textShadow: '0 0 40px #FAF6EE, 0 0 12px #FAF6EE',
          }}>
          <h1 className="font-display text-7xl font-semibold leading-[0.9] text-emerald-brand sm:text-9xl">
            {LINES.map(([text, to, start]) => {
              const a = `clamp(0, calc((var(--p) - ${start}) * 10), 1)`
              return (
                <Link key={text} to={to} className="block w-fit hover:text-gold-deep"
                  style={{
                    '--a': a,
                    opacity: 'var(--a)',
                    transform: 'translateY(calc((1 - var(--a)) * 48px))',
                    filter: 'blur(calc((1 - var(--a)) * 12px))',
                  }}>
                  {text}
                </Link>
              )
            })}
          </h1>
          <div className="mt-8" style={{ opacity: 'clamp(0, calc(1 - var(--p) * 5), 1)' }}>
            <p className="max-w-md text-lg">A calm, trusted place to buy and book from local South Africans.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop?type=product" className="rounded-full bg-emerald-brand px-7 py-3 text-cream" style={{ textShadow: 'none' }}>Browse products</Link>
              <Link to="/shop?type=service" className="rounded-full border border-emerald-brand bg-cream px-7 py-3 text-emerald-brand" style={{ textShadow: 'none' }}>Find a service</Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs text-emerald-brand"
          style={{ opacity: 'clamp(0, calc(1 - var(--p) * 12), 1)' }}>
          <span>Scroll</span>
          <span className="block h-10 w-px bg-emerald-brand" style={{ animation: 'scroll-hint 2s ease-in-out infinite' }} />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-emerald-brand px-4 text-center"
          style={{ clipPath: 'circle(max(0%, calc((var(--p) - 0.82) * 600%)) at 50% 60%)' }}>
          <p className="font-display text-5xl font-semibold text-cream sm:text-7xl"
            style={{ opacity: 'clamp(0, calc((var(--p) - 0.9) * 10), 1)' }}>
            Local, all in one place.
          </p>
        </div>
      </div>
    </section>
  )
}

function Gallery({ items }) {
  const ref = useRef(null)
  const track = useRef(null)
  useScrollProgress(ref)

  useEffect(() => {
    const section = ref.current
    const el = track.current
    if (!section || !el) return undefined

    function measure() {
      if (section.dataset.reduce === 'true') return
      const dist = Math.max(0, el.scrollWidth - window.innerWidth)
      section.style.height = `${window.innerHeight + dist}px`
      section.style.setProperty('--dist', `${dist}px`)
    }

    measure()
    const timer = setTimeout(measure, 500)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [items])

  return (
    <section ref={ref} className="relative" style={{ height: '100vh', '--p': 0, '--dist': '0px' }}>
      <div className="pin-stage sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-20">
        <div ref={track} className="pin-track flex w-max gap-6 px-4"
          style={{ transform: 'translate3d(calc(var(--p) * var(--dist) * -1), 0, 0)', willChange: 'transform' }}>
          <div className="flex w-[min(80vw,24rem)] shrink-0 flex-col justify-center pr-6">
            <h2 className="font-display text-6xl font-semibold leading-none text-emerald-brand">Just listed</h2>
            <p className="mt-4">Fresh from local sellers. Keep scrolling.</p>
            <Link to="/shop?type=product" className="mt-4 w-fit text-sm text-emerald-brand underline">See all products</Link>
          </div>
          {items.map((l) => <ListingCard key={l.id} listing={l} className="w-64 shrink-0 sm:w-72" />)}
          <div className="w-4 shrink-0" />
        </div>
        <div className="absolute inset-x-4 bottom-8 h-px bg-gold/40">
          <div className="h-px bg-gold-deep" style={{ width: 'calc(var(--p) * 100%)' }} />
        </div>
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

  const mixed = [...products, ...services].sort(newest)

  return (
    <main>
      <Hero listings={mixed} />

      <section className="bg-emerald-brand text-cream">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-8">
          <Reveal as="h2" className="font-display text-5xl font-semibold text-gold">Departments</Reveal>
          <div className="mt-8 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((c, i) => (
              <Reveal key={c.name} delay={(i % 3) * 90}>
                <Link to={`/shop?category=${encodeURIComponent(c.name)}`}
                  className="group flex items-baseline justify-between gap-3 border-b border-gold/30 py-3 transition hover:border-gold">
                  <span className="font-display text-2xl transition group-hover:translate-x-2 group-hover:text-gold">{c.name}</span>
                  <span className="shrink-0 text-xs text-cream/70">{availability(c)}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
        <Wave flip />
      </section>

      {products.length > 0 ? (
        <Gallery items={products.slice(0, 10)} />
      ) : (
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <h2 className="font-display text-5xl font-semibold text-emerald-brand">Just listed</h2>
          <p className="mt-2 text-sm">{loading ? 'Loading…' : 'New products are on their way.'}</p>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-7xl px-4">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-gold/50 pb-3">
          <Reveal as="h2" className="font-display text-5xl font-semibold text-emerald-brand">Ready to book</Reveal>
          <Link to="/shop?type=service" className="text-sm text-emerald-brand underline">See all</Link>
        </div>
        {!loading && services.length === 0 && <p className="text-sm">New services are on their way.</p>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {services.slice(0, 4).map((l, i) => (
            <Reveal key={l.id} delay={i * 100}><ListingCard listing={l} /></Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-8 px-4 md:grid-cols-3">
        {TRUST.map(([title, text], i) => (
          <Reveal key={title} delay={i * 120} className="border-l-2 border-gold pl-4">
            <p className="font-display text-2xl font-semibold text-emerald-brand">{title}</p>
            <p className="mt-1 text-sm">{text}</p>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4">
        <Reveal className="border-y border-gold py-12 text-center">
          <h2 className="font-display text-5xl font-semibold text-emerald-brand">Sell on Zolara</h2>
          <p className="mx-auto mt-3 max-w-xl">
            Get found and paid without building your own website. Your first 3 months are free, and we take no commission on your sales.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-emerald-brand px-7 py-3 text-cream">Start selling</Link>
            <Link to="/supplier-rules" className="rounded-full border border-emerald-brand px-7 py-3 text-emerald-brand">Read the supplier rules</Link>
          </div>
        </Reveal>
      </section>
    </main>
  )
}