import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { CONTACT_EMAIL } from '../lib/legal.js'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

const TOPICS = [
  'Question about an order or booking',
  'Refund',
  'Selling on Zolara',
  'My account or personal data',
  'Report a problem or a supplier',
  'Something else',
]

const ROUTES = [
  ['Order or booking', 'See the status, pay or cancel under My orders or My bookings.', '/my-orders'],
  ['Refund', 'Paid something that went wrong? Request a refund from My orders or My bookings.', '/my-bookings'],
  ['Selling on Zolara', 'Read how joining, fees and payouts work.', '/supplier-rules'],
  ['Your personal data', 'Ask for a copy, a correction or deletion in the Your data section of your Account page.', '/account'],
]

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
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-1 text-3xl font-semibold text-emerald-brand">Contact us</h1>
      <p className="mb-8 text-sm text-gold-deep">
        A real person at Zolara reads every message.
      </p>

      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <section>
          {sent ? (
            <div className="rounded-xl border border-gold-deep bg-white p-6">
              <p className="font-display text-3xl font-semibold text-emerald-brand">Message sent</p>
              <p className="mt-2 text-sm">
                Thank you. We will reply to {form.email} as soon as we can. Please check your spam
                folder if you do not hear from us.
              </p>
              <button type="button" onClick={() => setSent(false)}
                className="mt-4 rounded-full border border-gold-deep px-5 py-2 text-sm text-gold-deep">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input required maxLength={100} placeholder="Your name" value={form.name}
                onChange={set('name')} className={input} />
              <input required type="email" maxLength={200} placeholder="Your email" value={form.email}
                onChange={set('email')} className={input} />
              <select value={form.topic} onChange={set('topic')} className={input}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <textarea required rows={6} maxLength={2000} placeholder="How can we help?"
                value={form.message} onChange={set('message')} className={input} />
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website}
                onChange={set('website')}
                className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" />
              <p className="text-xs">
                Please do not include card numbers or passwords. We use your details only to reply to
                you. See our <Link to="/privacy" className="text-emerald-brand underline">Privacy Policy</Link>.
              </p>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button disabled={busy}
                className="self-start rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
          <p className="mt-6 text-sm">
            Prefer email? Write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-brand underline">{CONTACT_EMAIL}</a>.
          </p>
        </section>

        <aside className="flex flex-col gap-3">
          <p className="font-display text-2xl font-semibold text-emerald-brand">Often the quickest route</p>
          {ROUTES.map(([title, text, to]) => (
            <Link key={title} to={to}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gold/40 transition hover:-translate-y-0.5 hover:ring-gold-deep">
              <p className="text-sm font-semibold text-emerald-brand">{title}</p>
              <p className="mt-1 text-xs leading-relaxed">{text}</p>
            </Link>
          ))}
        </aside>
      </div>
    </main>
  )
}