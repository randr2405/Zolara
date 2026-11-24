import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATALOG, formatZAR } from '../lib/constants.js'
import ListingCard from '../components/ListingCard.jsx'

const SLIDES = [
  {
    title: 'Shop it.', text: 'Products from local sellers, all in one calm place.',
    cta: 'Browse products', to: '/shop?type=product', kind: 'product',
    bg: 'from-emerald-brand to-emerald-brand', fg: 'text-cream', btn: 'bg-gold text-emerald-brand',
    art: 'text-gold',
  },
  {
    title: 'Book it.', text: 'Stylists, plumbers, tutors and more. You pay only after they accept.',
    cta: 'Find a service', to: '/shop?type=service', kind: 'service',
    bg: 'from-gold to-gold', fg: 'text-emerald-brand', btn: 'bg-emerald-brand text-cream',
    art: 'text-emerald-brand',
  },
  {
    title: 'Love it.', text: 'Enjoy the result, knowing every purchase supports someone local.',
    cta: 'Explore everything', to: '/shop', kind: 'all',
    bg: 'from-white to-cream', fg: 'text-emerald-brand', btn: 'bg-emerald-brand text-cream',
    art: 'text-gold',
  },
]

const POPULAR = [
  'Hair styling', 'Plumbing', 'Skincare', 'Car wash & detailing', 'Baked goods',
  'Photography', 'Tutoring', 'Cleaning', 'Furniture', 'Phones & accessories',
]

const SUB_TO_CAT = Object.fromEntries(CATALOG.flatMap((c) => c.subs.map((s) => [s.name, c.name])))
const SUB_TO_TYPE = Object.fromEntries(CATALOG.flatMap((c) => c.subs.map((s) => [s.name, s.type])))
const enc = encodeURIComponent
const noBar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2'

const TRUST = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.', 'check'],
  ['Secure PayFast checkout', 'We never see or store your card details.', 'lock'],
  ['Reviewed suppliers', 'Every business is checked before going live.', 'shield'],
  ['Local, every time', 'South African businesses only.', 'pin'],
]

const STEPS = [
  ['Shop it', 'Browse products made and sold by South African businesses.'],
  ['Book it', 'Pick a trusted local service and pay only after they accept.'],
  ['Love it', 'Enjoy the result, knowing you helped a local business grow.'],
]

const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  search: 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  heart: 'M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  check: 'M5 12l5 5L20 7',
  pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bag: 'M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
}

const newest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
const placeOf = (l) => l.city || l.suburb || ''

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

function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

function useFavourites() {
  const [favs, setFavs] = useState(() => readStore('zolara-favourites', []))
  const toggle = (id) =>
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      writeStore('zolara-favourites', next)
      return next
    })
  return [favs, toggle]
}

function Icon({ name, className = 'h-5 w-5', fill = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

function Swoosh({ className = '' }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.85" />
      <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

function Divider() {
  return (
    <div className="mx-auto mt-10 flex max-w-7xl items-center gap-3 px-4 sm:mt-12" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
      <Swoosh className="h-6 w-6 text-gold" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
    </div>
  )
}

function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return undefined
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        io.disconnect()
      }
    }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref}
      className={`transition duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}>
      {children}
    </div>
  )
}

function Tag({ children, className = '' }) {
  return (
    <span className={`relative inline-block bg-gold py-1 pl-5 pr-3 font-bold text-emerald-brand [clip-path:polygon(0_50%,10px_0,100%_0,100%_100%,10px_100%)] ${className}`}>
      <i className="absolute left-[7px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
      {children}
    </span>
  )
}

function SearchBar({ listings }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const term = q.trim().toLowerCase()
  const hits = term ? listings.filter((l) => l.title?.toLowerCase().includes(term)).slice(0, 4) : []
  const topics = (term ? POPULAR.filter((s) => s.toLowerCase().includes(term)) : POPULAR).slice(0, 5)

  function submit(e) {
    e.preventDefault()
    setOpen(false)
    navigate(term ? `/shop?q=${enc(q.trim())}` : '/shop')
  }

  return (
    <div ref={box} className="relative">
      <form onSubmit={submit} role="search"
        className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-sm ring-1 ring-gold/60 transition focus-within:ring-2 focus-within:ring-gold-deep">
        <Icon name="search" className="h-5 w-5 shrink-0 text-gold-deep" />
        <input id="home-search" type="search" value={q} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search products and services"
          aria-label="Search products and services"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-charcoal placeholder:text-charcoal/50 focus:outline-none" />
        <button type="submit"
          className={`rounded-full bg-emerald-brand px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-emerald-brand/90 ${ring}`}>
          Search
        </button>
      </form>
      {open && (topics.length > 0 || hits.length > 0) && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-gold/50">
          {topics.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-gold-deep">{term ? 'Categories' : 'Popular right now'}</p>
              {topics.map((s) => (
                <Link key={s} to={`/shop?q=${enc(s)}`} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-cream ${ring}`}>
                  <Icon name={SUB_TO_TYPE[s] === 'service' ? 'calendar' : 'bag'} className="h-4 w-4 text-gold-deep" />
                  {s}
                </Link>
              ))}
            </>
          )}
          {hits.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-xs font-medium text-gold-deep">Listings</p>
              {hits.map((l) => (
                <Link key={l.id} to={`/listing/${l.id}`} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-cream ${ring}`}>
                  {l.thumb ? (
                    <img src={l.thumb} alt="" loading="lazy" className="h-8 w-8 rounded-md object-cover" />
                  ) : (
                    <span className="h-8 w-8 rounded-md bg-cream" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  <span className="font-display text-emerald-brand">{formatZAR(l.priceCents)}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Floating({ items }) {
  const spots = ['right-2 top-6 rotate-6', 'right-28 top-28 -rotate-6 lg:right-32', 'right-4 bottom-4 rotate-3']
  if (items.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-y-0 right-6 hidden w-72 md:block">
      {items.slice(0, 3).map((l, i) => (
        <Link key={l.id} to={`/listing/${l.id}`} tabIndex={-1}
          className={`pointer-events-auto absolute w-32 transition duration-500 hover:z-10 hover:scale-105 ${spots[i]}`}>
          <img src={l.thumb} alt={l.title} decoding="async"
            className="aspect-square w-full rounded-xl object-cover shadow-2xl ring-4 ring-white" />
          <Tag className="absolute -bottom-2 left-2 font-display text-xs">{formatZAR(l.priceCents)}</Tag>
        </Link>
      ))}
    </div>
  )
}

function Banner({ pics }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(0)

  useEffect(() => {
    if (paused) return undefined
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6500)
    return () => clearInterval(t)
  }, [paused])

  const go = (n) => setI((n + SLIDES.length) % SLIDES.length)

  function touchStart(e) {
    touchX.current = e.touches[0].clientX
    setPaused(true)
  }

  function touchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1))
    setPaused(false)
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl shadow-lg ring-1 ring-gold/60 sm:h-72 lg:h-[26rem]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={touchStart} onTouchEnd={touchEnd}>
      {SLIDES.map((s, n) => (
        <div key={s.title} aria-hidden={n !== i}
          className={`absolute inset-0 flex items-center bg-gradient-to-br p-6 pb-12 transition-opacity duration-700 sm:p-12 sm:pb-12 ${s.bg} ${s.fg} ${
            n === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <Swoosh className={`pointer-events-none absolute right-0 top-0 h-full w-3/5 opacity-30 sm:opacity-100 ${s.art}`} />
          <Floating items={pics[s.kind]} />
          <div className="relative max-w-sm">
            <h2 className="font-display text-5xl font-semibold leading-none sm:text-7xl">{s.title}</h2>
            <p className="mt-3 text-base sm:text-lg">{s.text}</p>
            <Link to={s.to} tabIndex={n === i ? 0 : -1}
              className={`mt-5 inline-block rounded-full px-7 py-3 font-medium shadow-md transition hover:-translate-y-0.5 ${s.btn} ${ring}`}>
              {s.cta}
            </Link>
          </div>
        </div>
      ))}
      <button onClick={() => go(i - 1)} aria-label="Previous slide"
        className={`absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand shadow sm:flex ${ring}`}>‹</button>
      <button onClick={() => go(i + 1)} aria-label="Next slide"
        className={`absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-emerald-brand shadow sm:flex ${ring}`}>›</button>
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2">
        {SLIDES.map((s, n) => (
          <button key={s.title} onClick={() => setI(n)} aria-label={`Show slide ${n + 1}`} className="p-2">
            <span className={`block h-2 rounded-full shadow-sm transition-all ${n === i ? 'w-6 bg-emerald-brand ring-1 ring-white' : 'w-2 bg-emerald-brand/40 ring-1 ring-white/70'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

function SideTiles() {
  return (
    <>
      <Link to="/shop?type=product&max=250"
        className={`group flex min-h-36 flex-1 flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gold/60 transition hover:-translate-y-1 hover:shadow-lg sm:p-5 ${ring}`}>
        <Tag className="w-fit font-display text-base sm:text-xl">Under R250</Tag>
        <span>
          <span className="block font-display text-xl font-semibold leading-tight text-emerald-brand sm:text-2xl">Small price, local made</span>
          <span className="text-xs sm:text-sm">Shop the best finds under R250.</span>
        </span>
      </Link>
      <Link to="/shop"
        className={`group flex min-h-36 flex-1 flex-col justify-end rounded-2xl bg-emerald-brand p-4 text-cream shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-5 ${ring}`}>
        <span className="font-display text-xl font-semibold leading-tight text-gold sm:text-2xl">Founder and preferred suppliers</span>
        <span className="mt-1 text-xs sm:text-sm">Shown first, and held to the same rules as everyone.</span>
      </Link>
    </>
  )
}

function DepartmentCircles({ pics }) {
  return (
    <div className={`-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 lg:hidden ${noBar}`}>
      {CATALOG.map((c) => (
        <Link key={c.name} to={`/shop?category=${enc(c.name)}`}
          className={`flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-lg ${ring}`}>
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-brand font-display text-2xl font-semibold text-gold shadow-sm ring-2 ring-gold/70">
            {pics[c.name] ? (
              <img src={pics[c.name]} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              c.name.charAt(0)
            )}
          </span>
          <span className="line-clamp-2 text-center text-[11px] leading-tight text-emerald-brand">{c.name}</span>
        </Link>
      ))}
    </div>
  )
}

function TrustStrip() {
  return (
    <section aria-label="Why shop on Zolara"
      className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-px overflow-hidden border-y border-gold/40 bg-gold/30 md:grid-cols-4">
      {TRUST.map(([title, text, icon]) => (
        <div key={title} className="flex items-start gap-3 bg-white px-3 py-3 sm:px-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-gold-deep">
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-emerald-brand">{title}</span>
            <span className="block text-xs">{text}</span>
          </span>
        </div>
      ))}
    </section>
  )
}

function ModeToggle({ mode, setMode }) {
  const options = [['all', 'Everything'], ['product', 'Products'], ['service', 'Services']]
  return (
    <div className="mx-auto mt-6 flex max-w-7xl justify-center px-4 sm:mt-8">
      <div role="group" aria-label="Show on this page" className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gold/60">
        {options.map(([value, label]) => (
          <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value}
            className={`rounded-full px-4 py-2 text-sm font-medium transition sm:px-6 ${ring} ${
              mode === value ? 'bg-emerald-brand text-cream shadow' : 'text-emerald-brand hover:bg-cream'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Title({ children, to, extra }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="min-w-0 bg-emerald-brand py-2 pl-4 pr-8 font-display text-lg font-semibold leading-tight text-cream [clip-path:polygon(0_0,100%_0,calc(100%_-_20px)_100%,0_100%)] sm:pl-5 sm:pr-10 sm:text-2xl">
        {children}
      </h2>
      <span className="hidden h-0.5 flex-1 bg-gold sm:block" />
      {extra && <div className="ml-auto shrink-0 sm:ml-0">{extra}</div>}
      {to && <Link to={to} className={`ml-auto shrink-0 rounded py-2 text-sm font-medium text-emerald-brand underline sm:ml-0 ${ring}`}>See all</Link>}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="w-40 shrink-0 animate-pulse rounded-xl bg-white p-2 shadow-sm ring-1 ring-gold/20 sm:w-52">
      <div className="aspect-square w-full rounded-lg bg-cream" />
      <div className="mt-3 h-3 w-3/4 rounded bg-cream" />
      <div className="mt-2 h-3 w-1/2 rounded bg-cream" />
      <div className="mt-4 h-4 w-1/3 rounded bg-gold/30" />
    </div>
  )
}

function Rail({ title, to, items, loading, favs, onFav, badge, extra, empty }) {
  const scroller = useRef(null)

  if (!loading && items.length === 0 && !empty) return null

  const by = (dir) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <section className="mx-auto mt-8 max-w-7xl px-4 sm:mt-10">
      <Title to={to} extra={extra}>{title}</Title>
      {!loading && items.length === 0 ? (
        empty
      ) : (
        <div className="relative">
          <button onClick={() => by(-1)} aria-label="Scroll left"
            className={`absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-emerald-brand shadow ring-1 ring-gold/50 md:flex ${ring}`}>‹</button>
          <div ref={scroller} className={`-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 ${noBar}`}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : items.slice(0, 12).map((l) => {
                  const tagText = badge ? badge(l) : null
                  const saved = favs.includes(l.id)
                  return (
                    <div key={l.id} className="relative w-40 shrink-0 snap-start sm:w-52">
                      <ListingCard listing={l} className="h-full w-full" />
                      {tagText && <Tag className="absolute left-0 top-2 z-10 text-xs">{tagText}</Tag>}
                      <button onClick={() => onFav(l.id)} aria-pressed={saved}
                        aria-label={saved ? `Remove ${l.title} from favourites` : `Save ${l.title} to favourites`}
                        className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-110 ${saved ? 'text-emerald-brand' : 'text-gold-deep'} ${ring}`}>
                        <Icon name="heart" className="h-4 w-4" fill={saved} />
                      </button>
                    </div>
                  )
                })}
          </div>
          <button onClick={() => by(1)} aria-label="Scroll right"
            className={`absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-emerald-brand shadow ring-1 ring-gold/50 md:flex ${ring}`}>›</button>
        </div>
      )}
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12" aria-label="How Zolara works">
      <Reveal>
        <Title>How Zolara works</Title>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(([title, text], n) => (
            <li key={title} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gold/40">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-brand font-display text-lg font-semibold text-gold">{n + 1}</span>
              <span>
                <span className="block font-display text-xl font-semibold text-emerald-brand">{title}</span>
                <span className="mt-1 block text-sm">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  )
}

function SellerBanner() {
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12">
      <div className="relative overflow-hidden rounded-2xl bg-emerald-brand p-6 text-cream shadow-lg ring-1 ring-gold/60 sm:p-10">
        <Swoosh className="pointer-events-none absolute -right-8 -top-8 h-64 w-64 text-gold opacity-40 sm:opacity-70" />
        <div className="relative max-w-xl">
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Run a local business? List it on Zolara.</h2>
          <p className="mt-2 text-sm sm:text-base">Get found, get trusted and get paid without building your own website or running ads.</p>
          <Link to="/sell"
            className={`mt-5 inline-block rounded-full bg-gold px-7 py-3 font-medium text-emerald-brand shadow-md transition hover:-translate-y-0.5 ${ring}`}>
            Become a seller
          </Link>
        </div>
      </div>
    </section>
  )
}

function SellerSpotlight({ spot, items }) {
  if (!spot || !spot.sellerName) return null
  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12" aria-label="Seller spotlight">
      <Reveal>
        <Title>Meet a local seller</Title>
        <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gold/40 md:grid-cols-[16rem_1fr] md:p-6">
          <div className="flex flex-col justify-center">
            <p className="font-display text-2xl font-semibold leading-tight text-emerald-brand sm:text-3xl">{spot.sellerName}</p>
            {placeOf(spot) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gold-deep">
                <Icon name="pin" className="h-4 w-4" />
                {placeOf(spot)}
              </p>
            )}
            <p className="mt-3 text-sm">Every purchase from a local seller like this keeps the money in your community.</p>
            {spot.sellerId && (
              <Link to={`/shop?seller=${enc(spot.sellerId)}`}
                className={`mt-4 w-fit rounded-full border border-gold-deep px-5 py-2 text-sm font-medium text-emerald-brand transition hover:bg-emerald-brand hover:text-cream ${ring}`}>
                Visit their shop
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.slice(0, 4).map((l) => (
              <Link key={l.id} to={`/listing/${l.id}`} className={`group relative block overflow-hidden rounded-xl ${ring}`}>
                {l.thumb ? (
                  <img src={l.thumb} alt={l.title} loading="lazy"
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <span className="block aspect-square w-full bg-cream" />
                )}
                <Tag className="absolute bottom-2 left-0 font-display text-xs">{formatZAR(l.priceCents)}</Tag>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('all')
  const [city, setCity] = useState(() => readStore('zolara-area', ''))
  const [favs, toggleFav] = useFavourites()

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

  const pickCity = (value) => {
    setCity(value)
    writeStore('zolara-area', value)
  }

  const all = [...products, ...services].sort(newest)
  const inMode = (arr) => (mode === 'all' ? arr : arr.filter((l) => l.type === mode))
  const showProducts = mode !== 'service'
  const showServices = mode !== 'product'

  const pics = {
    product: products.filter((l) => l.thumb),
    service: services.filter((l) => l.thumb),
    all: all.filter((l) => l.thumb),
  }
  const under = products
    .filter((l) => l.priceCents <= 25000 && l.stock > 0)
    .sort((a, b) => a.priceCents - b.priceCents)
  const almost = products.filter((l) => l.stock > 0 && l.stock <= 3)
  const preferred = all.filter((l) => l.sellerPreferred)
  const cities = [...new Set(all.map(placeOf).filter(Boolean))].sort()
  const near = city ? inMode(all).filter((l) => placeOf(l) === city) : []
  const spot = preferred.find((l) => l.sellerName) || all.find((l) => l.sellerName)
  const spotItems = spot && spot.sellerId ? all.filter((l) => l.sellerId === spot.sellerId) : spot ? [spot] : []

  const deptPic = {}
  all.forEach((l) => {
    if (l.thumb && !deptPic[l.category]) deptPic[l.category] = l.thumb
  })

  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => document.getElementById('home-search')?.focus(), 350)
  }

  return (
    <main className="bg-cream pb-24 md:pb-8">
      <section className="mx-auto max-w-7xl px-4 pt-3 sm:pt-4">
        <SearchBar listings={all} />
      </section>

      <section className="mx-auto mt-3 grid max-w-7xl gap-3 px-4 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_16rem]">
        <nav aria-label="Departments" className="hidden overflow-y-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gold/40 lg:block lg:h-[26rem]">
          <p className="px-3 py-2 font-display text-xl font-semibold text-emerald-brand">Departments</p>
          {CATALOG.map((c) => (
            <Link key={c.name} to={`/shop?category=${enc(c.name)}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-cream hover:pl-4 hover:text-emerald-brand ${ring}`}>
              {c.name}
              <span className="text-gold-deep" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
        <Banner pics={pics} />
        <div className="hidden flex-col gap-3 xl:flex xl:h-[26rem]"><SideTiles /></div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:hidden"><SideTiles /></div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <DepartmentCircles pics={deptPic} />
      </section>

      <TrustStrip />

      <section className="mx-auto mt-4 max-w-7xl px-4">
        <div className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 ${noBar}`}>
          {POPULAR.map((s) => (
            <Link key={s} to={`/shop?category=${enc(SUB_TO_CAT[s])}&subcategory=${enc(s)}`}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border border-gold-deep bg-white py-2 pl-3 pr-4 text-sm text-emerald-brand transition hover:-translate-y-0.5 hover:bg-emerald-brand hover:text-cream ${ring}`}>
              <Icon name={SUB_TO_TYPE[s] === 'service' ? 'calendar' : 'bag'} className="h-4 w-4 text-gold-deep" />
              {s}
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium text-gold-deep">
                {SUB_TO_TYPE[s] === 'service' ? 'Service' : 'Product'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ModeToggle mode={mode} setMode={setMode} />

      {!loading && all.length === 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4 sm:mt-10">
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-gold-deep bg-white p-6 text-center sm:p-10">
            <Swoosh className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-gold opacity-30" />
            <p className="relative font-display text-2xl font-semibold text-emerald-brand sm:text-3xl">Our first local suppliers are joining</p>
            <p className="relative mx-auto mt-2 max-w-md text-sm">New products and services will appear here soon. Browse the departments in the meantime.</p>
            <Link to="/shop" className={`relative mt-5 inline-block rounded-full bg-emerald-brand px-6 py-2.5 text-sm font-medium text-cream ${ring}`}>
              Browse departments
            </Link>
          </div>
        </section>
      )}

      {showProducts && (
        <Rail title="New arrivals" to="/shop?type=product" items={products} loading={loading} favs={favs} onFav={toggleFav} />
      )}
      {showProducts && (
        <Rail title="Great under R250" to="/shop?type=product&max=250" items={under} loading={false} favs={favs} onFav={toggleFav} />
      )}
      {showProducts && (
        <Rail title="Almost gone" to="/shop?type=product" items={almost} loading={false} favs={favs} onFav={toggleFav}
          badge={(l) => `Only ${l.stock} left`} />
      )}
      {showServices && (
        <Rail title="Book a local service" to="/shop?type=service" items={services} loading={loading} favs={favs} onFav={toggleFav} />
      )}
      {cities.length > 0 && (
        <Rail title="Near you" to={city ? `/shop?area=${enc(city)}` : undefined} items={near} loading={false} favs={favs} onFav={toggleFav}
          extra={(
            <select value={city} onChange={(e) => pickCity(e.target.value)} aria-label="Choose your area"
              className={`rounded-full border border-gold-deep bg-white px-3 py-1.5 text-sm text-emerald-brand ${ring}`}>
              <option value="">Choose your area</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          empty={(
            <p className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-gold/40">
              {city ? `Nothing in ${city} yet. New local sellers join every week.` : 'Choose your area to see businesses close to you.'}
            </p>
          )} />
      )}
      <Rail title="Founder and preferred suppliers" to="/shop" items={inMode(preferred)} loading={false} favs={favs} onFav={toggleFav} />

      <SellerSpotlight spot={spot} items={spotItems} />

      <Divider />
      <HowItWorks />
      <SellerBanner />
      <Divider />

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12">
        <Reveal>
          <Title>Shop by department</Title>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {CATALOG.map((c) => {
              const pic = deptPic[c.name]
              return (
                <Link key={c.name} to={`/shop?category=${enc(c.name)}`}
                  className={`group relative flex h-36 flex-col justify-end overflow-hidden rounded-xl bg-emerald-brand p-3 text-cream shadow-sm ring-1 ring-gold/50 transition hover:-translate-y-1 hover:shadow-xl sm:h-44 sm:p-4 ${ring}`}>
                  {pic ? (
                    <img src={pic} alt="" loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  ) : (
                    <Swoosh className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-gold opacity-60" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-emerald-brand via-emerald-brand/60 to-emerald-brand/10" />
                  <span className="absolute left-0 top-3 bg-gold py-0.5 pl-2 pr-4 text-xs font-medium text-emerald-brand [clip-path:polygon(0_0,100%_0,calc(100%_-_10px)_100%,0_100%)]">
                    {availability(c)}
                  </span>
                  <span className="relative font-display text-xl font-semibold leading-tight sm:text-2xl">{c.name}</span>
                  <span className="relative hidden truncate text-xs text-cream/80 sm:block">{c.subs.slice(0, 3).map((s) => s.name).join(', ')}</span>
                </Link>
              )
            })}
          </div>
        </Reveal>
      </section>

      <nav aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/50 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          <li>
            <Link to="/" aria-current="page" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-emerald-brand ${ring}`}>
              <Icon name="home" className="h-5 w-5" fill />
              Home
            </Link>
          </li>
          <li>
            <button onClick={focusSearch} className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] text-charcoal ${ring}`}>
              <Icon name="search" className="h-5 w-5" />
              Search
            </button>
          </li>
          <li>
            <Link to="/shop" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] text-charcoal ${ring}`}>
              <Icon name="grid" className="h-5 w-5" />
              Browse
            </Link>
          </li>
          <li>
            <Link to="/favourites" className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-charcoal ${ring}`}>
              <Icon name="heart" className="h-5 w-5" />
              Saved
              {favs.length > 0 && (
                <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-emerald-brand">
                  {favs.length}
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link to="/account" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] text-charcoal ${ring}`}>
              <Icon name="user" className="h-5 w-5" />
              Account
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}