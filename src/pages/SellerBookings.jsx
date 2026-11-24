import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import SellerFeedback from '../components/SellerFeedback.jsx'
import { formatZAR } from '../lib/constants.js'
import { BOOKING_STATUS, formatWhen } from '../lib/bookings.js'
import { notify } from '../lib/notify.js'
import {
  STATUS_SUMMARY_COLUMNS, downloadWorkbook, stampDate, summaryByStatus,
} from '../lib/reportExport.js'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
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
  back: 'M15 6l-6 6 6 6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
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

const setStatus = (id, status) =>
  updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp() })

const sortKey = (b) => `${b.date || ''} ${b.time || ''}`
const readyToComplete = (b) =>
  b.status === 'confirmed' && b.paymentStatus === 'paid' && b.refundStatus !== 'requested'

function nextStep(b) {
  const paid = b.paymentStatus === 'paid'
  if (b.status === 'requested') return 'New request. Accept or decline it.'
  if (b.status === 'confirmed' && !paid) return 'Waiting for the customer to pay.'
  if (b.status === 'confirmed' && paid && b.refundStatus === 'requested') return 'Paid, but the customer has requested a refund.'
  if (b.status === 'confirmed' && paid) return 'Paid. Mark it as completed once the service is done.'
  if (b.status === 'completed') return 'Completed.'
  if (b.status === 'declined') return 'You declined this booking.'
  if (b.status === 'cancelled') return 'The customer cancelled this booking.'
  return ''
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

function BookingCard({ booking: b, feedback }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
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
  const dateObj = b.date ? new Date(`${b.date}T12:00:00`) : null
  const day = dateObj ? dateObj.toLocaleDateString('en-ZA', { day: 'numeric' }) : ''
  const month = dateObj ? dateObj.toLocaleDateString('en-ZA', { month: 'short' }).replace('.', '').toUpperCase() : ''
  const requestedOn = b.createdAt?.toDate?.().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  const reference = b.id.slice(0, 8).toUpperCase()
  const phoneLink = b.buyerPhone ? `tel:${String(b.buyerPhone).replace(/\s+/g, '')}` : ''

  async function act(status) {
    setBusy(true)
    setError('')
    try {
      await setStatus(b.id, status)
      notify('booking', b.id, status)
      setConfirming(null)
    } catch (err) {
      console.error(err)
      setError('Could not update the booking. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const confirmCopy = {
    decline: {
      text: `Decline this booking from ${b.buyerName || 'the customer'}? They will be told.`,
      yes: 'Yes, decline',
      status: 'declined',
      danger: true,
    },
    complete: {
      text: 'Mark this service as completed? The customer will be asked for feedback.',
      yes: 'Yes, mark completed',
      status: 'completed',
      danger: false,
    },
  }[confirming]

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
          <p className="break-words text-sm text-charcoal/70">{b.buyerName || 'Customer'}</p>
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

      <p className="mt-3 text-sm text-charcoal/80">{nextStep(b)}</p>

      {b.notes && (
        <div className="mt-3 rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
          <p className="text-xs font-medium text-gold-deep">Customer notes</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm">{b.notes}</p>
        </div>
      )}

      {b.refundStatus === 'requested' && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">
          The customer has requested a refund. Zolara is reviewing it.
        </p>
      )}
      {refunded && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">Zolara refunded this booking.</p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {confirming ? (
        <div className="mt-4 rounded-2xl border border-gold/60 bg-cream p-4" role="alertdialog" aria-label="Confirm action">
          <p className={`text-sm font-medium ${confirmCopy.danger ? 'text-red-800' : 'text-emerald-brand'}`}>
            {confirmCopy.text}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button
              disabled={busy}
              onClick={() => act(confirmCopy.status)}
              className={`${confirmCopy.danger ? btnDanger : btnPrimary} w-full bg-white sm:w-auto ${confirmCopy.danger ? '' : '!bg-emerald-brand'}`}
            >
              {busy ? 'Saving…' : confirmCopy.yes}
            </button>
            <button disabled={busy} onClick={() => setConfirming(null)} className={`${btnQuiet} w-full bg-white sm:w-auto`}>
              Go back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {b.status === 'requested' && (
            <>
              <button disabled={busy} onClick={() => act('confirmed')} className={`${btnPrimary} w-full sm:w-auto`}>
                {busy ? 'Saving…' : 'Accept'}
              </button>
              <button onClick={() => setConfirming('decline')} className={`${btnDanger} w-full sm:w-auto`}>
                Decline
              </button>
            </>
          )}
          {readyToComplete(b) && (
            <button onClick={() => setConfirming('complete')} className={`${btnPrimary} w-full sm:w-auto`}>
              Mark as completed
            </button>
          )}
          {phoneLink && (
            <a href={phoneLink} className={`${btnQuiet} w-full gap-2 sm:w-auto`}>
              <Icon name="phone" size={16} />
              Call
            </a>
          )}
          {b.buyerEmail && (
            <a href={`mailto:${b.buyerEmail}`} className={`${btnQuiet} w-full gap-2 sm:w-auto`}>
              <Icon name="mail" size={16} />
              Email
            </a>
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

      {feedback && <SellerFeedback docId={b.id} data={feedback} />}

      {open && (
        <div className="mt-4 border-t border-gold/40 pt-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="When" value={formatWhen(b.date, b.time)} />
            <DetailRow label="Price" value={formatZAR(b.priceCents)} />
            <DetailRow label="Customer" value={b.buyerName} />
            <DetailRow label="Phone" value={b.buyerPhone} />
            <DetailRow label="Email" value={b.buyerEmail} />
            <DetailRow label="Payment" value={paid ? 'Paid' : refunded ? 'Refunded' : 'Not paid'} />
            <DetailRow label="Requested" value={requestedOn} />
            <DetailRow label="Booking reference" value={reference} />
          </dl>
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
  confirmed: 'No confirmed bookings.',
  completed: 'No completed bookings yet.',
  closed: 'No declined or cancelled bookings.',
}

export default function SellerBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'bookings'), where('sellerId', '==', user.uid)),
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
        query(collection(db, 'feedback'), where('sellerId', '==', user.uid)),
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
      await downloadWorkbook(`zolara-bookings-${stampDate()}.xlsx`, [
        {
          name: 'Bookings',
          title: 'Zolara · Your bookings',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}`,
          columns: [
            { header: 'Requested', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Service', key: 'service', width: 30 },
            { header: 'Booking date', key: 'date', type: 'date', width: 16 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Status', key: 'status', width: 22 },
            { header: 'Payment', key: 'payment', width: 14 },
            { header: 'Price', key: 'price', type: 'cents', width: 16 },
            { header: 'Customer', key: 'customer', width: 24 },
            { header: 'Phone', key: 'phone', width: 16 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Notes', key: 'notes', width: 40 },
          ],
          rows: bookings.map((b) => ({
            createdAt: b.createdAt,
            service: b.listingTitle,
            date: b.date ? new Date(`${b.date}T12:00:00`) : null,
            time: b.time,
            status: BOOKING_STATUS[b.status] || b.status,
            payment: b.paymentStatus === 'paid' ? 'Paid' : b.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid',
            price: b.priceCents,
            customer: b.buyerName,
            phone: b.buyerPhone,
            email: b.buyerEmail,
            notes: b.notes,
          })),
        },
        {
          name: 'Summary',
          title: 'Zolara · Bookings by status',
          subtitle: 'Value is the total booking price for each status.',
          columns: STATUS_SUMMARY_COLUMNS,
          rows: summaryByStatus(bookings, BOOKING_STATUS, (b) => b.priceCents || 0),
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
      .filter((b) => b.status === 'requested' || readyToComplete(b))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    confirmed: list
      .filter((b) => b.status === 'confirmed')
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    completed: list.filter((b) => b.status === 'completed'),
    closed: list.filter((b) => b.status === 'declined' || b.status === 'cancelled'),
  }
  const tabs = [
    ['action', 'Action needed', groups.action.length, true],
    ['confirmed', 'Confirmed', groups.confirmed.length, false],
    ['completed', 'Completed', groups.completed.length, false],
    ['closed', 'Declined / cancelled', groups.closed.length, false],
  ]
  const activeTab = tab || (groups.action.length > 0 ? 'action' : 'confirmed')

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/seller"
            className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-cream/85 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <Icon name="back" />
            Back to dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Bookings</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Respond to requests, follow up on payment and mark finished services as completed.
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
            <p className="font-display text-xl font-semibold text-emerald-brand">No booking requests yet</p>
            <p className="mt-2 text-sm text-charcoal/70">When a customer books one of your services, it will show up here.</p>
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
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {groups[activeTab].map((b) => (
                  <BookingCard key={b.id} booking={b} feedback={feedback[b.id]} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}