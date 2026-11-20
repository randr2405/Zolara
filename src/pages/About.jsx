import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import { CONTACT_EMAIL, OWNER } from '../lib/legal.js'
import { PREFERRED_LABEL } from '../lib/constants.js'

const PILLARS = [
  ['Shop it', 'Buy products made and sold by South African businesses.'],
  ['Book it', 'Find and book trusted local service providers, from stylists to plumbers to tutors.'],
  ['List it', 'Sellers and service providers list what they offer and reach new customers without building their own platform.'],
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

function Title({ children }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <h2 className="bg-emerald-brand py-2 pl-5 pr-10 font-display text-2xl font-semibold text-cream [clip-path:polygon(0_0,100%_0,calc(100%_-_20px)_100%,0_100%)]">
        {children}
      </h2>
      <span className="h-0.5 flex-1 bg-gold" />
    </div>
  )
}

export default function About() {
  return (
    <main className="pb-6">
      <section className="mx-auto max-w-7xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-brand p-8 text-cream shadow-lg ring-1 ring-gold/60 sm:p-14">
          <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-gold/30 blur-3xl" />
          <svg viewBox="0 0 400 400" className="pointer-events-none absolute right-0 top-0 h-full w-3/5 text-gold" aria-hidden="true">
            <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.85" />
            <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.35" />
          </svg>
          <div className="relative max-w-xl">
            <p className="mb-3 text-sm uppercase tracking-widest text-gold">About Zolara</p>
            <h1 className="font-display text-5xl font-semibold leading-none sm:text-7xl">
              Shop it. Book it. Love it.
            </h1>
            <p className="mt-5 text-base sm:text-lg">
              Zolara is a South African online marketplace where you can buy local products and book
              local services in one place. It is built to help local businesses be found, trusted and
              paid, and to give shoppers a calm, reliable way to support them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/shop" className="rounded-full bg-gold px-7 py-3 font-medium text-emerald-brand shadow-md transition hover:-translate-y-0.5">
                Browse the shop
              </Link>
              <Link to="/signup" className="rounded-full border border-gold px-7 py-3 font-medium text-gold transition hover:-translate-y-0.5">
                Sell on Zolara
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <Title>What you can do here</Title>
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(([name, text]) => (
            <div key={name} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gold/40">
              <p className="font-display text-3xl font-semibold text-emerald-brand">{name}</p>
              <p className="mt-2 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <Title>Why “Zolara”</Title>
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
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
              Emerald green stands for trust and growth. Gold, used sparingly, stands for quality and
              warmth. The logo is a shopping bag shaped like a Z, with a flowing gold curve that
              suggests people and businesses coming together.
            </p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-cream p-6 ring-1 ring-gold/60">
            <p className="font-display text-3xl font-semibold leading-tight text-emerald-brand">
              Support local businesses, don’t kill them.
            </p>
            <p className="mt-3 text-sm text-gold-deep">Every purchase helps someone local grow.</p>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <Title>Why Zolara exists</Title>
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="flex flex-col gap-2 text-sm leading-relaxed sm:text-base">
            {REASONS.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed sm:text-base">
            Zolara exists to close that gap: one calm, trusted place where people can shop local
            products and book local services, and where local businesses can be found, trusted and
            supported.
          </p>
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <Title>How it works</Title>
        <ol className="grid gap-3 md:grid-cols-5">
          {STEPS.map(([name, text], i) => (
            <li key={name} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gold/40">
              <span className="font-display text-3xl font-semibold text-gold-deep">{i + 1}</span>
              <p className="mt-1 text-sm font-semibold text-emerald-brand">{name}</p>
              <p className="mt-1 text-xs leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          Every supplier is reviewed before their listings go live, and suppliers who receive repeated
          valid complaints are removed. Read the{' '}
          <Link to="/supplier-rules" className="text-emerald-brand underline">supplier rules</Link>.
        </p>
      </Reveal>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <Title>Who is behind Zolara</Title>
        <div className="rounded-2xl bg-white p-6 text-sm leading-relaxed shadow-sm ring-1 ring-gold/40 sm:text-base">
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
      </Reveal>

      <Reveal as="section" className="mx-auto mt-12 max-w-7xl px-4">
        <div className="rounded-2xl bg-emerald-brand p-8 text-center text-cream shadow-lg ring-1 ring-gold/60">
          <p className="font-display text-4xl font-semibold text-gold">Questions? Say hello.</p>
          <p className="mt-2 text-sm">
            Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/terms" className="underline hover:text-gold">Terms of Use</Link>
            <Link to="/privacy" className="underline hover:text-gold">Privacy Policy</Link>
            <Link to="/supplier-rules" className="underline hover:text-gold">Supplier Rules</Link>
          </div>
        </div>
      </Reveal>
    </main>
  )
}