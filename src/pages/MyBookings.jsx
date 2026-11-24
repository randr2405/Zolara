import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { BOOKING_STATUS, formatWhen } from '../lib/bookings.js'
import { downloadWorkbook, stampDate } from '../lib/reportExport.js'
import { paymentErrorMessage, startPayment } from '../lib/payments.js'
import { notify } from '../lib/notify.js'
import RefundRequest from '../components/RefundRequest.jsx'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnGold = `${btn} border border-gold-deep text-gold-deep hover:bg-gold-deep hover:text-white`
const btnDanger = `${btn} border border-red-700 text-red-700 hover:bg-red-700 hover:text-white`
const btnQuiet = `${btn} border border-gold/50 text-charcoal hover:bg-cream`

const STATUS_STYLE = {
  requested: 'bg-cream text-gold-deep ring-1 ring-gold/60',
  confirmed: 'bg-emerald-brand text-cream',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-cream text-charcoal/70 ring-1 ring-charcoal/20',
}

const ICONS = {
  chevron: 'M6 9l6 6 6-6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  thumb: 'M7 11v9H4v-9h3z M7 11l4-7c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 18 19H7',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
}

function Icon({ name, size = 18 }) {
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

const sortKey = (b) => `${b.date || ''} ${b.time || ''}`

function nextStep(b, hasFeedback) {
  const paid = b.paymentStatus === 'paid'
  if (b.status === 'requested') return 'Waiting for the supplier to respond.'
  if (b.status === 'confirmed' && !paid) return 'Confirmed. Pay now to secure your booking.'
  if (b.status === 'confirmed' && paid) return 'Confirmed and paid. You are all set.'
  if (b.status === 'declined') return 'The supplier could not take this booking.'
  if (b.status === 'cancelled') return 'You cancelled this booking.'
  if (b.status === 'completed' && !hasFeedback) return 'Completed. Tell us how it went.'
  if (b.status === 'completed') return 'Completed. Thank you for your feedback.'
  return ''
}

function FeedbackForm({ booking, user }) {
  const [satisfied, setSatisfied] = useState(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (satisfied === null) return setError('Please choose an option.')
    if (!satisfied && !comment.trim()) return setError('Please tell us what went wrong.')
    setBusy(true)
    setError('')
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'feedback', booking.id), {
        bookingId: booking.id,
        buyerId: user.uid,
        sellerId: booking.sellerId,
        sellerName: booking.sellerName,
        listingTitle: booking.listingTitle,
        satisfied,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      })
      batch.set(doc(db, 'reviews', booking.id), {
        sellerId: booking.sellerId,
        listingId: booking.listingId,
        satisfied,
        listingTitle: booking.listingTitle,
        kind: 'booking',
        createdAt: serverTimestamp(),
      })
      await batch.commit()
    } catch (err) {
      console.error(err)
      setError('Could not send your feedback. Please try again.')
      setBusy(false)
    }
  }

  const choice = (value, icon, title, hint, activeClass) => (
    <button
      type="button"
      onClick={() => { setSatisfied(value); setError('') }}
      aria-pressed={satisfied === value}
      className={`flex min-h-[72px] flex-col items-start gap-1 rounded-2xl border p-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        satisfied === value ? `${activeClass} bg-cream` : 'border-gold/50 bg-white hover:bg-cream'}`}
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon name={icon} />
        {title}
      </span>
      <span className="text-xs text-charcoal/70">{hint}</span>
    </button>
  )

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-2xl border border-gold/40 bg-cream/60 p-4">
      <p className="text-sm font-semibold text-emerald-brand">Were you satisfied with this service?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {choice(true, 'thumb', 'Yes, I was happy', 'Everything went well', 'border-emerald-brand text-emerald-brand')}
        {choice(false, 'flag', 'No, there was a problem', 'We will look into it', 'border-red-700 text-red-800')}
      </div>
      {satisfied !== null && (
        <div>
          <label htmlFor={`comment-${booking.id}`} className="sr-only">Your comment</label>
          <textarea
            id={`comment-${booking.id}`}
            rows={3}
            placeholder={satisfied === false ? 'Tell us what went wrong' : 'Anything you would like to add? (optional)'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border border-gold/50 bg-white p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button disabled={busy} className={`${btnPrimary} w-full sm:w-auto sm:self-start`}>
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gold-deep">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
    </div>
  )
}

function BookingCard({ booking: b, feedback, user }) {
  const [open, setOpen] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const lastStatus = useRef(b.status)

  useEffect(() => {
    if (lastStatus.current !== b.status) {
      lastStatus.current = b.status
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 2500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [b.status])

  const paid = b.paymentStatus === 'paid'
  const refunded = b.paymentStatus === 'refunded'
  const canCancel = b.status === 'requested' || (b.status === 'confirmed' && !paid)
  const dateObj = b.date ? new Date(`${b.date}T12:00:00`) : null
  const day = dateObj ? dateObj.toLocaleDateString('en-ZA', { day: 'numeric' }) : ''
  const month = dateObj ? dateObj.toLocaleDateString('en-ZA', { month: 'short' }).replace('.', '').toUpperCase() : ''
  const reference = b.id.slice(0, 8).toUpperCase()

  async function pay() {
    setError('')
    setPaying(true)
    try {
      await startPayment('booking', b.id)
    } catch (err) {
      console.error(err)
      setError(paymentErrorMessage(err))
      setPaying(false)
    }
  }

  async function cancelBooking() {
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled', updatedAt: serverTimestamp() })
      notify('booking', b.id, 'cancelled')
      setConfirmingCancel(false)
    } catch (err) {
      console.error(err)
      setError('Could not cancel the booking. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${
        flash ? 'border-gold ring-2 ring-gold/60' : 'border-gold/40'}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="flex h-16 w-14 flex-none flex-col items-center justify-center rounded-xl bg-emerald-brand text-cream sm:h-[72px] sm:w-16"
          aria-hidden="true"
        >
          {dateObj ? (
            <>
              <span className="font-display text-2xl font-semibold leading-none text-gold">{day}</span>
              <span className="mt-1 text-[11px] font-semibold tracking-wide">{month}</span>
              {b.time && <span className="mt-0.5 text-[11px] text-cream/80">{b.time}</span>}
            </>
          ) : (
            <span className="text-xs">No date</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-emerald-brand">{b.listingTitle}</p>
          <p className="break-words text-sm text-charcoal/70">{b.sellerName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] || STATUS_STYLE.requested}`}>
              {BOOKING_STATUS[b.status] || b.status}
            </span>
            {paid && (
              <span className="rounded-full bg-cream px-3 py-0.5 text-xs font-medium text-emerald-brand ring-1 ring-emerald-brand/40">
                Paid
              </span>
            )}
            {refunded && (
              <span className="rounded-full bg-cream px-3 py-0.5 text-xs font-medium text-gold-deep ring-1 ring-gold/60">
                Refunded
              </span>
            )}
          </div>
        </div>

        <p className="flex-none text-right text-sm font-semibold text-emerald-brand">{formatZAR(b.priceCents)}</p>
      </div>

      <p className="mt-3 text-sm text-charcoal/80">{nextStep(b, Boolean(feedback))}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {confirmingCancel ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4" role="alertdialog" aria-label="Confirm cancellation">
          <p className="text-sm font-medium text-red-800">
            Cancel this booking with {b.sellerName}? This cannot be undone.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button disabled={busy} onClick={cancelBooking} className={`${btnDanger} w-full bg-white sm:w-auto`}>
              {busy ? 'Cancelling…' : 'Yes, cancel booking'}
            </button>
            <button disabled={busy} onClick={() => setConfirmingCancel(false)} className={`${btnQuiet} w-full bg-white sm:w-auto`}>
              Keep booking
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {b.status === 'confirmed' && !paid && (
            <button disabled={paying} onClick={pay} className={`${btnPrimary} w-full sm:w-auto`}>
              {paying ? 'Opening PayFast…' : `Pay now · ${formatZAR(b.priceCents)}`}
            </button>
          )}
          {canCancel && (
            <button onClick={() => setConfirmingCancel(true)} className={`${btnQuiet} w-full sm:w-auto`}>
              {b.status === 'requested' ? 'Cancel request' : 'Cancel booking'}
            </button>
          )}
          {b.status === 'declined' && (
            <Link to="/shop" className={`${btnGold} w-full sm:w-auto`}>
              Find another service
            </Link>
          )}
          {b.status === 'completed' && !feedback && (
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              aria-expanded={showFeedback}
              className={`${btnGold} w-full sm:w-auto`}
            >
              {showFeedback ? 'Hide feedback form' : 'How did it go?'}
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full px-3 text-sm font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:ml-auto"
          >
            {open ? 'Hide details' : 'View details'}
            <span className={`transition ${open ? 'rotate-180' : ''}`}>
              <Icon name="chevron" />
            </span>
          </button>
        </div>
      )}

      {b.status === 'completed' && !feedback && showFeedback && <FeedbackForm booking={b} user={user} />}

      {b.status === 'completed' && feedback && (
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-emerald-brand">
          {feedback.satisfied
            ? 'Thank you for your feedback. We are glad you were happy.'
            : 'Thank you for telling us. We take service seriously and will look into this.'}
        </p>
      )}

      {open && (
        <div className="mt-4 border-t border-gold/40 pt-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="When" value={formatWhen(b.date, b.time)} />
            <DetailRow label="Price" value={formatZAR(b.priceCents)} />
            <DetailRow label="Supplier" value={b.sellerName} />
            <DetailRow label="Payment" value={paid ? 'Paid' : refunded ? 'Refunded' : 'Not paid'} />
            <DetailRow label="Booking reference" value={reference} />
          </dl>
          <RefundRequest kind="booking" item={b} />
        </div>
      )}
    </li>
  )
}

function Skeleton() {
  return (
    <ul className="flex flex-col gap-4" role="status" aria-label="Loading bookings">
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-2xl border border-gold/30 bg-white p-5">
          <div className="flex gap-4">
            <div className="h-[72px] w-16 rounded-xl bg-cream" />
            <div className="flex-1">
              <div className="h-4 w-2/3 rounded bg-cream" />
              <div className="mt-2 h-3 w-1/3 rounded bg-cream" />
              <div className="mt-3 h-5 w-24 rounded-full bg-cream" />
            </div>
          </div>
          <div className="mt-4 h-11 rounded-full bg-cream" />
        </li>
      ))}
    </ul>
  )
}

const EMPTY = {
  action: 'Nothing needs your attention right now.',
  upcoming: 'No upcoming bookings.',
  past: 'No completed bookings yet.',
  closed: 'No cancelled or declined bookings.',
}

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'bookings'), where('buyerId', '==', user.uid)),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setBookings(items)
        },
        (err) => {
          console.error(err)
          setError('Could not load your bookings. Please refresh and try again.')
          setBookings([])
        }
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'feedback'), where('buyerId', '==', user.uid)),
        (snap) => {
          const map = {}
          snap.docs.forEach((d) => { map[d.id] = d.data() })
          setFeedback(map)
        },
        (err) => console.error(err)
      ),
    [user.uid]
  )

  async function download() {
    setError('')
    try {
      await downloadWorkbook(`zolara-my-bookings-${stampDate()}.xlsx`, [
        {
          name: 'My bookings',
          title: 'Zolara · My bookings',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}`,
          columns: [
            { header: 'Requested', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Service', key: 'service', width: 30 },
            { header: 'Supplier', key: 'supplier', width: 26 },
            { header: 'Booking date', key: 'date', type: 'date', width: 16 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Status', key: 'status', width: 22 },
            { header: 'Payment', key: 'payment', width: 14 },
            { header: 'Price', key: 'price', type: 'cents', width: 16 },
            { header: 'Satisfied', key: 'satisfied', width: 12 },
            { header: 'Your feedback', key: 'comment', width: 40 },
          ],
          rows: bookings.map((b) => {
            const f = feedback[b.id]
            return {
              createdAt: b.createdAt,
              service: b.listingTitle,
              supplier: b.sellerName,
              date: b.date ? new Date(`${b.date}T12:00:00`) : null,
              time: b.time,
              status: BOOKING_STATUS[b.status] || b.status,
              payment: b.paymentStatus === 'paid' ? 'Paid' : b.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid',
              price: b.priceCents,
              satisfied: f ? (f.satisfied ? 'Yes' : 'No') : '',
              comment: f?.comment || '',
            }
          }),
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Could not build the Excel file.')
    }
  }

  const list = bookings || []
  const groups = {
    action: list
      .filter((b) => (b.status === 'confirmed' && b.paymentStatus !== 'paid') || (b.status === 'completed' && !feedback[b.id]))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    upcoming: list
      .filter((b) => b.status === 'requested' || b.status === 'confirmed')
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    past: list.filter((b) => b.status === 'completed'),
    closed: list.filter((b) => b.status === 'declined' || b.status === 'cancelled'),
  }
  const tabs = [
    ['action', 'Action needed', groups.action.length, true],
    ['upcoming', 'Upcoming', groups.upcoming.length, false],
    ['past', 'Past', groups.past.length, false],
    ['closed', 'Cancelled / declined', groups.closed.length, false],
  ]
  const activeTab = tab || (groups.action.length > 0 ? 'action' : 'upcoming')

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">My bookings</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Track your requests, pay for confirmed bookings and tell us how your service went.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={download}
              disabled={!bookings || bookings.length === 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream disabled:opacity-60"
            >
              <Icon name="download" />
              Download Excel
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {!bookings ? (
          <Skeleton />
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-emerald-brand">No bookings yet</p>
            <p className="mt-2 text-sm text-charcoal/70">When you book a service, it will show up here.</p>
            <Link to="/shop" className={`${btnPrimary} mt-5`}>
              Browse services
            </Link>
          </div>
        ) : (
          <>
            <div
              className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
              role="group"
              aria-label="Booking sections"
            >
              {tabs.map(([v, label, n, attention]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  aria-pressed={activeTab === v}
                  className={`inline-flex min-h-[44px] flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                    activeTab === v
                      ? 'bg-emerald-brand text-cream'
                      : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
                >
                  {label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      attention && n > 0
                        ? 'bg-gold text-emerald-brand'
                        : activeTab === v
                          ? 'bg-cream/20 text-cream'
                          : 'bg-cream text-gold-deep'}`}
                  >
                    {n}
                  </span>
                </button>
              ))}
            </div>

            {groups[activeTab].length === 0 ? (
              <div className="rounded-2xl border border-gold/40 bg-white p-6 text-center shadow-sm">
                <p className="text-sm">{EMPTY[activeTab]}</p>
                {activeTab === 'upcoming' && (
                  <Link to="/shop" className={`${btnPrimary} mt-4`}>
                    Browse services
                  </Link>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {groups[activeTab].map((b) => (
                  <BookingCard key={b.id} booking={b} feedback={feedback[b.id]} user={user} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}