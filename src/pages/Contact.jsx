import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { CONTACT_EMAIL } from '../lib/legal.js'

const field =
  'w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-base text-charcoal placeholder:text-charcoal/50 focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold'

const label = 'mb-1.5 block text-sm font-medium text-emerald-brand'

const TOPICS = [
  'Question about an order or booking',
  'Refund',
  'Selling on Zolara',
  'My account or personal data',
  'Report a problem or a supplier',
  'Something else',
]

const ROUTES = [
  ['Order or booking', 'See the status, pay or cancel under My orders or My bookings.', '/my-orders', 'bag'],
  ['Refund', 'Paid something that went wrong? Request a refund from My orders or My bookings.', '/my-bookings', 'refund'],
  ['Selling on Zolara', 'Read how joining, fees and payouts work.', '/supplier-rules', 'store'],
  ['Your personal data', 'Ask for a copy, a correction or deletion in the Your data section of your Account page.', '/account', 'lock'],
]

const ICONS = {
  bag: 'M5 8h14l-1 12H6z M9 8V6a3 3 0 016 0v2',
  refund: 'M4 12a8 8 0 018-8 8 8 0 016 2.7L20 8 M20 4v4h-4 M20 12a8 8 0 01-8 8 8 8 0 01-6-2.7L4 16 M4 20v-4h4',
  store: 'M4 9l1.5-5h13L20 9 M4 9h16v11H4z M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 004 0 M10 20v-5h4v5',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  mail: 'M3 6h18v12H3z M3 7l9 7 9-7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M9 6l6 6-6 6',
}

function Icon({ name, size = 20 }) {
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

export default function Contact() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    name: profile?.displayName || '',
    email: user?.email || '',
    topic: TOPICS[0],
    message: '',
    website: '',
  })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const opened = useRef(Date.now())
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.message.trim().length < 10) return setError('Please write a little more so we can help.')
    setBusy(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, elapsed: Date.now() - opened.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'server')
      setSent(true)
      setForm({ ...form, message: '' })
    } catch (err) {
      console.error(err)
      setError(
        err.message === 'email'
          ? 'Please enter a valid email address.'
          : err.message === 'length'
            ? 'Your message is too short or too long. Please keep it under 2000 characters.'
            : err.message === 'fields'
              ? 'Please fill in every field.'
              : `Something went wrong. Please try again, or email ${CONTACT_EMAIL}.`
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-10 pt-10 text-cream sm:px-8 sm:pb-14 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Contact us</h1>
          <p className="mt-3 max-w-xl text-base text-cream/85 sm:text-lg">
            A real person at Zolara reads every message.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <div className="grid gap-8 md:grid-cols-[1.25fr_1fr] md:gap-10">
          <section className="order-2 md:order-1">
            {sent ? (
              <div
                role="status"
                className="rounded-2xl border border-gold-deep bg-white p-6 shadow-sm sm:p-8"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-brand text-gold">
                  <Icon name="check" size={24} />
                </span>
                <p className="mt-4 font-display text-3xl font-semibold text-emerald-brand">Message sent</p>
                <p className="mt-2 text-base leading-relaxed">
                  Thank you. We will reply to <span className="font-medium">{form.email}</span> as soon as we
                  can. Please check your spam folder if you do not hear from us.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 min-h-[44px] rounded-full border border-gold-deep px-6 py-2 text-sm font-medium text-gold-deep transition hover:bg-gold-deep hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-8"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className={label}>
                      Your name
                    </label>
                    <input
                      id="contact-name"
                      required
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={set('name')}
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className={label}>
                      Your email
                    </label>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      maxLength={200}
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={set('email')}
                      className={field}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-topic" className={label}>
                    What is this about?
                  </label>
                  <select id="contact-topic" value={form.topic} onChange={set('topic')} className={field}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor="contact-message" className="block text-sm font-medium text-emerald-brand">
                      How can we help?
                    </label>
                    <span className="text-xs text-charcoal/60" aria-live="off">
                      {form.message.length}/2000
                    </span>
                  </div>
                  <textarea
                    id="contact-message"
                    required
                    rows={6}
                    maxLength={2000}
                    placeholder="Tell us what happened, and include an order or booking number if you have one."
                    value={form.message}
                    onChange={set('message')}
                    className={`${field} resize-y`}
                  />
                </div>

                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.website}
                  onChange={set('website')}
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  name="website"
                />

                <p className="rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-charcoal/80">
                  Please do not include card numbers or passwords. We use your details only to reply to you.
                  See our{' '}
                  <Link to="/privacy" className="font-medium text-emerald-brand underline">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}

                <button
                  disabled={busy}
                  className="min-h-[48px] w-full rounded-full bg-emerald-brand px-8 py-3 text-base font-semibold text-cream transition hover:bg-emerald-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto sm:self-start"
                >
                  {busy ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold/40 bg-white p-4 sm:p-5">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-emerald-brand text-gold">
                <Icon name="mail" />
              </span>
              <p className="min-w-0 text-sm">
                Prefer email? Write to{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="break-words font-medium text-emerald-brand underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </section>

          <aside className="order-1 flex flex-col gap-3 md:order-2">
            <h2 className="font-display text-2xl font-semibold text-emerald-brand">
              Often the quickest route
            </h2>
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-1">
              {ROUTES.map(([title, text, to, icon]) => (
                <Link
                  key={title}
                  to={to}
                  className="group flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gold/40 transition hover:ring-gold-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep"
                >
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-brand text-gold">
                    <Icon name={icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-emerald-brand">{title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-charcoal/80">{text}</span>
                  </span>
                  <span className="self-center text-gold-deep transition group-hover:translate-x-0.5">
                    <Icon name="arrow" size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}