import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Reveal from '../components/Reveal.jsx'
import { CONTACT_EMAIL, OWNER } from '../lib/legal.js'
import { PREFERRED_LABEL, formatZAR } from '../lib/constants.js'

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep focus-visible:ring-offset-2'

const ICONS = {
  bag: 'M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  store: 'M4 9l1-5h14l1 5M4 9v11h16V9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M9 20v-6h6v6',
  check: 'M5 12l5 5L20 7',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cross: 'M6 6l12 12M18 6L6 18',
}

const PILLARS = [
  ['Shop it', 'Buy products made and sold by South African businesses.', 'bag'],
  ['Book it', 'Find and book trusted local service providers, from stylists to plumbers to tutors.', 'calendar'],
  ['List it', 'Sellers and service providers list what they offer and reach new customers without building their own platform.', 'store'],
]

const PROMISES = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.', 'check'],
  ['Secure PayFast checkout', 'We never see or store your card details.', 'lock'],
  ['Reviewed suppliers', 'Every business is checked before going live.', 'shield'],
  ['Local, every time', 'South African businesses only.', 'pin'],
]

const STEPS = [
  ['Find it', 'Browse local products and services, or search by department.'],
  ['Send a request', 'Order or book. No payment is taken at this stage.'],
  ['Supplier accepts', 'The supplier confirms, and we email you straight away.'],
  ['Pay securely', 'Pay through PayFast. We never see or store your card details.'],
  ['Tell us how it went', 'Share whether you were satisfied. It helps other customers and keeps suppliers honest.'],
]

const REASONS = [
  'A few big players dominate online shopping.',
  'Cheap imports are taking more of the market.',
  'Local small businesses struggle to be seen without paying for their own website and ads.',
  'Services have little trust, no secure payments and too many scams.',
]

const SWATCHES = [
  ['Emerald', '#0B3D2E', 'Trust and growth', 'text-cream'],
  ['Gold', '#C9A24B', 'Quality and warmth', 'text-emerald-brand'],
  ['Cream', '#FAF6EE', 'Calm backgrounds and cards', 'text-emerald-brand'],
  ['Charcoal', '#2B2B2B', 'Clear, easy-to-read text', 'text-cream'],
]

const FAQ = [
  [
    'When do I pay?',
    <>Only after the supplier accepts your order or booking. When you send a request, no payment is taken. Once they confirm, we email you straight away and you pay securely through PayFast.</>,
  ],
  [
    'Do you store my card details?',
    <>No. Payments are handled by PayFast, and we never see or store your card details.</>,
  ],
  [
    'What if a supplier does not accept?',
    <>You are not charged unless the supplier accepts, so you can go back and find another local supplier.</>,
  ],
  [
    'How are suppliers kept accountable?',
    <>Every supplier is reviewed before their listings go live, and suppliers who receive repeated valid complaints are removed. Read the <Link to="/supplier-rules" className={`text-emerald-brand underline ${ring}`}>supplier rules</Link>.</>,
  ],
  [
    'How do I become a seller?',
    <>Create an account through the <Link to="/signup" className={`text-emerald-brand underline ${ring}`}>sign up page</Link>, then list what you offer. We review your business before your listings go live.</>,
  ],
  [
    'I still have a question.',
    <>Email us at <a href={`mailto:${CONTACT_EMAIL}`} className={`text-emerald-brand underline ${ring}`}>{CONTACT_EMAIL}</a> or visit the <Link to="/contact" className={`text-emerald-brand underline ${ring}`}>contact page</Link>.</>,
  ],
]

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function Tag({ children, className = '' }) {
  return (
    <span className={`relative inline-block bg-gold py-1 pl-5 pr-3 font-bold text-emerald-brand [clip-path:polygon(0_50%,10px_0,100%_0,100%_100%,10px_100%)] ${className}`}>
      <i className="absolute left-[7px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
      {children}
    </span>
  )
}

function Title({ children, dark = false }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2 className={`py-2 pl-5 pr-10 font-display text-2xl font-semibold [clip-path:polygon(0_0,100%_0,calc(100%_-_20px)_100%,0_100%)] ${
        dark ? 'bg-gold text-emerald-brand' : 'bg-emerald-brand text-cream'}`}>
        {children}
      </h2>
      <span className="h-0.5 flex-1 bg-gold" />
    </div>
  )
}

function Band({ tone = 'cream', children, label }) {
  const tones = {
    cream: 'bg-cream',
    white: 'bg-white',
    emerald: 'bg-emerald-brand text-cream',
    gold: 'bg-gold text-emerald-brand',
  }
  return (
    <section aria-label={label} className={`relative overflow-hidden ${tones[tone]}`}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">{children}</div>
    </section>
  )
}

function Logo() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex flex-col items-center gap-1 py-6">
        <div className="flex items-center gap-2">
          <Swoosh className="h-14 w-14 text-gold" />
          <span className="font-display text-6xl font-semibold text-emerald-brand">Zolara</span>
        </div>
        <span className="text-sm tracking-widest text-gold-deep">Shop it. Book it. Love it.</span>
      </div>
    )
  }
  return (
    <img src="/zolara-logo.png" alt="Zolara: a shopping bag shaped like a Z, with the slogan Shop it. Book it. Love it."
      onError={() => setFailed(true)} className="h-auto w-full object-contain" />
  )
}

function HeroCollage({ pics }) {
  const spots = [
    '-left-1 -top-3 -rotate-6 sm:-left-4',
    '-right-1 top-2 rotate-6 sm:-right-4',
    'bottom-0 left-6 rotate-3 sm:left-10',
  ]
  return (
    <div className="relative mx-auto h-72 w-full max-w-md sm:h-96">
      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-gold/60 sm:inset-x-10">
        <Logo />
      </div>
      {pics.slice(0, 3).map((l, i) => (
        <Link key={l.id} to={`/listing/${l.id}`} tabIndex={-1}
          className={`absolute z-10 w-24 transition duration-500 hover:scale-105 sm:w-32 ${spots[i]}`}>
          <img src={l.thumb} alt={l.title} loading="lazy" decoding="async"
            className="aspect-square w-full rounded-xl object-cover shadow-2xl ring-4 ring-white" />
          <Tag className="absolute -bottom-2 left-2 font-display text-xs">{formatZAR(l.priceCents)}</Tag>
        </Link>
      ))}
    </div>
  )
}

function Timeline() {
  return (
    <ol className="relative md:grid md:grid-cols-5 md:gap-4">
      <span className="absolute bottom-5 left-5 top-5 w-0.5 bg-gold md:hidden" aria-hidden="true" />
      <span className="absolute left-[10%] right-[10%] top-5 hidden h-0.5 bg-gold md:block" aria-hidden="true" />
      {STEPS.map(([name, text], i) => (
        <li key={name} className="relative pb-8 pl-16 last:pb-0 md:pb-0 md:pl-0 md:text-center">
          <span className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-brand font-display text-lg font-semibold text-gold ring-4 ring-white md:static md:mx-auto">
            {i + 1}
          </span>
          <p className="font-display text-xl font-semibold text-emerald-brand md:mt-4">{name}</p>
          <p className="mt-1 text-sm leading-relaxed">{text}</p>
        </li>
      ))}
    </ol>
  )
}

function Faq() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {FAQ.map(([question, answer]) => (
        <details key={question} className="group rounded-xl bg-white ring-1 ring-gold/40 open:shadow-sm">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-display text-lg font-semibold text-emerald-brand [&::-webkit-details-marker]:hidden ${ring}`}>
            {question}
            <span className="text-2xl leading-none text-gold-deep transition duration-300 group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed">{answer}</div>
        </details>
      ))}
    </div>
  )
}

export default function About() {
  const [listings, setListings] = useState([])

  useEffect(() => {
    let alive = true
    getDocs(
      query(
        collection(db, 'listings'),
        where('active', '==', true),
        where('sellerApproved', '==', true),
        limit(60)
      )
    )
      .then((snap) => {
        if (alive) setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const pics = listings.filter((l) => l.thumb)
  const suppliers = new Set(listings.map((l) => l.sellerId).filter(Boolean)).size
  const showStats = listings.length >= 10 && suppliers >= 3

  return (
    <main className="bg-cream">
      <section className="mx-auto max-w-7xl px-4 pt-3 sm:pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-brand p-6 text-cream shadow-lg ring-1 ring-gold/60 sm:p-12">
          <Swoosh className="pointer-events-none absolute -right-10 top-0 h-full w-3/5 text-gold opacity-30" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <Tag className="text-sm">Our story</Tag>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-none sm:text-7xl">
                Shop it. Book it. Love it.
              </h1>
              <p className="mt-5 max-w-xl text-base sm:text-lg">
                Zolara is a South African online marketplace where you can buy local products and book
                local services in one place. It is built to help local businesses be found, trusted and
                paid, and to give shoppers a calm, reliable way to support them.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/shop" className={`rounded-full bg-gold px-7 py-3 font-medium text-emerald-brand shadow-md transition hover:-translate-y-0.5 ${ring}`}>
                  Browse the shop
                </Link>
                <Link to="/signup" className={`rounded-full border border-gold px-7 py-3 font-medium text-gold transition hover:-translate-y-0.5 ${ring}`}>
                  Sell on Zolara
                </Link>
              </div>
            </div>
            <HeroCollage pics={pics} />
          </div>
        </div>
      </section>

      <section aria-label="Our promises"
        className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-px overflow-hidden border-y border-gold/40 bg-gold/30 md:grid-cols-4">
        {PROMISES.map(([title, text, icon]) => (
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

      <Band tone="cream" label="What you can do here">
        <Title>What you can do here</Title>
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(([name, text, icon]) => (
            <div key={name} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gold/40">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-brand text-gold">
                <Icon name={icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-3xl font-semibold text-emerald-brand">{name}</p>
              <p className="mt-2 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </Band>

      <Band tone="emerald" label="Why Zolara">
        <Swoosh className="pointer-events-none absolute -right-16 -top-10 h-96 w-96 text-gold opacity-20" />
        <Reveal as="div" className="relative">
          <Title dark>Why “Zolara”</Title>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="font-display text-6xl font-semibold leading-none sm:text-8xl">
                <span className="text-cream">zola</span>
                <span className="mx-3 text-cream/50">=</span>
                <span className="text-gold">calm</span>
              </p>
              <p className="mt-4 max-w-sm text-sm text-cream/80">
                An invented name inspired by the word “zola”, built around feeling safe and unhurried.
              </p>
            </div>
            <div className="space-y-3 text-sm leading-relaxed sm:text-base">
              <p>
                Zolara draws on “zola”, meaning calm. It is a calm, trusted place to buy and book from
                local South Africans.
              </p>
              <p>
                Trust is the biggest challenge for any marketplace, so we built the name, the colours
                and the whole experience around feeling safe and unhurried. Zolara is an invented name
                inspired by “zola”, so it is not tied to one language or group.
              </p>
              <p>
                The logo is a shopping bag shaped like a Z, with a flowing gold curve that suggests
                people and businesses coming together.
              </p>
            </div>
          </div>
        </Reveal>
      </Band>

      <Band tone="gold" label="Our message">
        <Swoosh className="pointer-events-none absolute -left-10 -top-10 h-72 w-72 text-emerald-brand opacity-10" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Support local businesses, don’t kill them.
          </p>
          <p className="mt-3 text-sm font-medium sm:text-base">Every purchase helps someone local grow.</p>
        </div>
      </Band>

      <Band tone="white" label="Our colours">
        <Title>The colours behind the brand</Title>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed sm:text-base">
          Emerald green stands for trust and growth. Gold, used sparingly, stands for quality and warmth.
          Together they feel elegant and grounded, and stand out from the bright blues, oranges and reds
          of the big online retailers.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SWATCHES.map(([name, hex, meaning, fg]) => (
            <div key={name} className={`flex h-36 flex-col justify-end rounded-xl p-4 shadow-sm ring-1 ring-gold/40 ${fg}`}
              style={{ backgroundColor: hex }}>
              <p className="font-display text-2xl font-semibold leading-tight">{name}</p>
              <p className="text-xs opacity-80">{hex}</p>
              <p className="mt-1 text-xs">{meaning}</p>
            </div>
          ))}
        </div>
      </Band>

      <Band tone="cream" label="Why Zolara exists">
        <Title>Why Zolara exists</Title>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-charcoal/10">
            <p className="font-display text-2xl font-semibold text-charcoal/70">What was missing</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-charcoal/70 sm:text-base">
              {REASONS.map((r) => (
                <li key={r} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-charcoal/50">
                    <Icon name="cross" className="h-3.5 w-3.5" />
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-emerald-brand p-6 text-cream shadow-lg ring-1 ring-gold/60">
            <Swoosh className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 text-gold opacity-25" />
            <div className="relative">
              <p className="font-display text-2xl font-semibold text-gold">What Zolara does</p>
              <p className="mt-4 text-sm leading-relaxed sm:text-base">
                Zolara exists to close that gap: one calm, trusted place where people can shop local
                products and book local services, and where local businesses can be found, trusted and
                supported.
              </p>
            </div>
            <Link to="/shop" className={`relative mt-6 w-fit rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-emerald-brand transition hover:-translate-y-0.5 ${ring}`}>
              See local businesses
            </Link>
          </div>
        </div>
      </Band>

      <Band tone="white" label="How it works">
        <Reveal as="div">
          <Title>How it works</Title>
          <Timeline />
          <p className="mt-8 text-sm">
            Every supplier is reviewed before their listings go live, and suppliers who receive repeated
            valid complaints are removed. Read the{' '}
            <Link to="/supplier-rules" className={`text-emerald-brand underline ${ring}`}>supplier rules</Link>.
          </p>
          {showStats && (
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-xl bg-cream p-4 ring-1 ring-gold/40">
                <dd className="font-display text-4xl font-semibold text-emerald-brand">{suppliers}</dd>
                <dt className="text-xs">Local suppliers</dt>
              </div>
              <div className="rounded-xl bg-cream p-4 ring-1 ring-gold/40">
                <dd className="font-display text-4xl font-semibold text-emerald-brand">
                  {listings.length >= 60 ? '60+' : listings.length}
                </dd>
                <dt className="text-xs">Live listings</dt>
              </div>
            </dl>
          )}
        </Reveal>
      </Band>

      <Band tone="cream" label="Questions and answers">
        <Reveal as="div">
          <Title>Good to know</Title>
          <Faq />
        </Reveal>
      </Band>

      <Band tone="white" label="Who is behind Zolara">
        <Title>Who is behind Zolara</Title>
        <div className="flex flex-col gap-5 rounded-2xl bg-cream p-6 ring-1 ring-gold/40 sm:flex-row sm:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-brand font-display text-2xl font-semibold text-gold ring-2 ring-gold">
            R&amp;R
          </span>
          <div className="text-sm leading-relaxed sm:text-base">
            <p>
              Zolara is owned by <strong>{OWNER}</strong>. R&amp;R Site Solutions is a division of {OWNER}.
            </p>
            <p className="mt-3">
              In the interest of being open with you: R&amp;R Site Solutions also sells on Zolara as its
              founding supplier, labelled “{PREFERRED_LABEL}”, and its listings may be shown first. It
              is held to the same rules as every other supplier. We use administrator access to
              bookings, orders and supplier details only to run the marketplace.
            </p>
          </div>
        </div>
      </Band>

      <Band tone="emerald" label="Get in touch">
        <Swoosh className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 text-gold opacity-25" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="font-display text-4xl font-semibold text-gold sm:text-5xl">Ready to shop local?</p>
          <p className="mt-2 text-sm sm:text-base">Find something you will love, or start selling to people nearby.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className={`rounded-full bg-gold px-7 py-3 font-medium text-emerald-brand shadow-md transition hover:-translate-y-0.5 ${ring}`}>
              Browse the shop
            </Link>
            <Link to="/signup" className={`rounded-full border border-gold px-7 py-3 font-medium text-gold transition hover:-translate-y-0.5 ${ring}`}>
              Sell on Zolara
            </Link>
          </div>
          <p className="mt-8 text-sm">
            Questions? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={`underline ${ring}`}>{CONTACT_EMAIL}</a>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/terms" className={`underline hover:text-gold ${ring}`}>Terms of Use</Link>
            <Link to="/privacy" className={`underline hover:text-gold ${ring}`}>Privacy Policy</Link>
            <Link to="/supplier-rules" className={`underline hover:text-gold ${ring}`}>Supplier Rules</Link>
          </div>
        </div>
      </Band>
    </main>
  )
}