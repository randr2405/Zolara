import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'

const TYPE_LABEL = {
  access: 'Copy of my data',
  correction: 'Correct my data',
  deletion: 'Delete my account',
}

const SELLER_LINKS = [
  ['Go to your seller dashboard', '/seller', 'grid'],
  ['Manage your bookings', '/seller/bookings', 'calendar'],
  ['Manage your orders', '/seller/orders', 'bag'],
  ['Payments and banking details', '/seller/payments', 'wallet'],
]

const BUYER_LINKS = [
  ['View your bookings', '/my-bookings', 'calendar'],
  ['View your orders', '/my-orders', 'bag'],
  ['Browse the shop', '/shop', 'store'],
]

const ICONS = {
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  bag: 'M5 8h14l-1 12H6z M9 8V6a3 3 0 016 0v2',
  wallet: 'M4 7h15a1 1 0 011 1v11H5a1 1 0 01-1-1z M4 7l12-3v3 M16 14h2',
  store: 'M4 9l1.5-5h13L20 9 M4 9h16v11H4z M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 004 0 M10 20v-5h4v5',
  arrow: 'M9 6l6 6-6 6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9 12l2 2 4-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
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

const fieldClass =
  'w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-base text-charcoal placeholder:text-charcoal/50 focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold'

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

function YourData({ user, profile }) {
  const [requests, setRequests] = useState([])
  const [type, setType] = useState('access')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'dataRequests'), where('userId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setRequests(items)
      }),
    [user.uid]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (type === 'deletion' && !window.confirm('Request deletion of your account and personal information?')) return
    setBusy(true)
    setError('')
    setSent(false)
    try {
      await addDoc(collection(db, 'dataRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || user.email,
        type,
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setMessage('')
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('Could not send your request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadPayments() {
    setError('')
    try {
      const seller = profile?.role === 'seller'
      const snap = await getDocs(
        query(collection(db, 'payments'), where(seller ? 'sellerId' : 'buyerId', '==', user.uid))
      )
      const rows = snap.docs
        .map((d) => d.data())
        .filter((p) => p.status !== 'pending')
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      const header = [
        'Date', 'Item', 'Type', seller ? 'Customer paid (R)' : 'Amount (R)',
        ...(seller ? ['PayFast fee (R)'] : []), 'Status',
      ]
      const lines = rows.map((p) => [
        (p.paidAt || p.createdAt)?.toDate?.().toISOString().slice(0, 10) || '',
        p.title,
        p.kind,
        (p.amountCents || 0) / 100,
        ...(seller ? [(p.feeCents || 0) / 100] : []),
        p.status,
      ])
      const csv = [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-zolara-payments.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Could not build your payment records.')
    }
  }

  const hasOpen = requests.some((r) => r.type === type && r.status === 'open')

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-sm">
      <div className="flex items-start gap-4 border-b border-gold/30 p-5 sm:p-6">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-emerald-brand text-gold">
          <Icon name="shield" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold text-emerald-brand">Your data</h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/80">
            You can ask us for a copy of the personal information we hold about you, ask us to correct
            it, or ask us to delete your account. We aim to respond within 30 days. For some requests we
            may need to confirm it is really you. We may keep records we are legally required to keep,
            such as bookings, orders and payments.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <label htmlFor="data-type" className="mb-1.5 block text-sm font-medium text-emerald-brand">
            What would you like to do?
          </label>
          <select
            id="data-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setSent(false)
            }}
            className={fieldClass}
          >
            {Object.entries(TYPE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="data-message" className="block text-sm font-medium text-emerald-brand">
              {type === 'correction' ? 'What should be corrected?' : 'Anything we should know?'}
            </label>
            <span className="text-xs text-charcoal/60">{message.length}/1000</span>
          </div>
          <textarea
            id="data-message"
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={type === 'correction' ? 'What should be corrected?' : 'Anything we should know? (optional)'}
            className={`${fieldClass} resize-y`}
          />
        </div>

        {hasOpen && (
          <p className="rounded-xl bg-cream px-4 py-3 text-sm">You already have an open request of this kind.</p>
        )}
        {sent && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm font-medium text-emerald-brand"
          >
            <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-emerald-brand text-gold">
              <Icon name="check" size={13} />
            </span>
            Request sent. We will be in touch.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          disabled={busy || hasOpen}
          className="min-h-[48px] w-full rounded-full bg-emerald-brand px-8 py-3 text-base font-semibold text-cream transition hover:bg-emerald-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto sm:self-start"
        >
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </form>

      <div className="border-t border-gold/30 bg-cream/60 p-5 sm:p-6">
        <p className="mb-3 text-sm">Download your payment records now, without sending a request.</p>
        <button
          type="button"
          onClick={downloadPayments}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold-deep px-5 py-2 text-sm font-medium text-gold-deep transition hover:bg-gold-deep hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <Icon name="download" size={18} />
          Download my payment records
        </button>
      </div>

      {requests.length > 0 && (
        <div className="border-t border-gold/30 p-5 sm:p-6">
          <h3 className="mb-3 font-display text-lg font-semibold text-emerald-brand">Your requests</h3>
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gold/30 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{TYPE_LABEL[r.type]}</span>
                  <span className="block text-xs text-gold-deep">
                    {r.createdAt?.toDate?.().toLocaleDateString('en-ZA')}
                  </span>
                </span>
                <span
                  className={`flex-none rounded-full px-3 py-1 text-xs font-medium ${
                    r.status === 'done' ? 'bg-emerald-brand text-cream' : 'bg-cream text-gold-deep ring-1 ring-gold/60'
                  }`}
                >
                  {r.status === 'done' ? 'Done' : 'Open'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function Account() {
  const { user, profile } = useAuth()
  const isSeller = profile?.role === 'seller'
  const links = isSeller ? SELLER_LINKS : BUYER_LINKS
  const name = profile?.displayName || 'Your account'
  const initial = (profile?.displayName || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-10 pt-10 text-cream sm:px-8 sm:pb-12 sm:pt-12">
        <div className="mx-auto flex max-w-3xl items-center gap-4 sm:gap-5">
          <span
            className="grid h-16 w-16 flex-none place-items-center rounded-full bg-gold font-display text-3xl font-semibold text-emerald-brand sm:h-20 sm:w-20 sm:text-4xl"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">{name}</h1>
            <p className="mt-1 break-all text-sm text-cream/85 sm:text-base">{user?.email}</p>
            <p className="mt-2 inline-block rounded-full bg-cream/15 px-3 py-1 text-xs font-medium text-cream">
              {isSeller ? 'Seller account' : 'Buyer account'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <nav aria-label="Account shortcuts">
          <ul className="grid gap-3 min-[560px]:grid-cols-2">
            {links.map(([label, to, icon]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex min-h-[64px] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gold/40 transition hover:ring-gold-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep"
                >
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-brand text-gold">
                    <Icon name={icon} />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-emerald-brand">{label}</span>
                  <span className="text-gold-deep transition group-hover:translate-x-0.5">
                    <Icon name="arrow" size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <YourData user={user} profile={profile} />
      </main>
    </div>
  )
}