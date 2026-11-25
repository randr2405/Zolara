import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_STATUS } from '../lib/orders.js'
import { deliveryOf, hasDeliveryCost, orderTotal } from '../lib/delivery.js'
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
  delivered: 'bg-cream text-charcoal/70 ring-1 ring-charcoal/20',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
}

const ICONS = {
  chevron: 'M6 9l6 6 6-6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  thumb: 'M7 11v9H4v-9h3z M7 11l4-7c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 18 19H7',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
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

const isClosed = (o) => o.status === 'cancelled' || o.status === 'declined'

function deliveryTypeLabel(o) {
  if (o.deliveryType === 'collection') return 'Collection only'
  if (o.deliveryType === 'free') return 'Free delivery'
  if (o.deliveryType === 'flat') return 'Flat delivery fee'
  return ''
}

function nextStep(o, hasFeedback) {
  const paid = o.paymentStatus === 'paid'
  if (o.status === 'requested') return 'Waiting for the supplier to confirm your order and the delivery cost.'
  if (o.status === 'confirmed' && !paid) return 'Confirmed. Check the total below, then pay now to secure your order.'
  if (o.status === 'confirmed' && paid) return 'Confirmed and paid.'
  if (o.status === 'declined') return 'The supplier could not fulfil this order.'
  if (o.status === 'cancelled') return 'You cancelled this order.'
  if (o.status === 'delivered' && !hasFeedback) return 'Delivered. Tell us how it went.'
  if (o.status === 'delivered') return 'Delivered. Thank you for your feedback.'
  return ORDER_STATUS[o.status] || ''
}

function FeedbackForm({ order, user }) {
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
      batch.set(doc(db, 'feedback', order.id), {
        kind: 'order',
        orderId: order.id,
        buyerId: user.uid,
        sellerId: order.sellerId,
        sellerName: order.sellerName,
        listingTitle: order.listingTitle,
        satisfied,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      })
      batch.set(doc(db, 'reviews', order.id), {
        sellerId: order.sellerId,
        listingId: order.listingId,
        satisfied,
        listingTitle: order.listingTitle,
        kind: 'order',
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
      <p className="text-sm font-semibold text-emerald-brand">Were you satisfied with this order?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {choice(true, 'thumb', 'Yes, I was happy', 'Everything went well', 'border-emerald-brand text-emerald-brand')}
        {choice(false, 'flag', 'No, there was a problem', 'We will look into it', 'border-red-700 text-red-800')}
      </div>
      {satisfied !== null && (
        <div>
          <label htmlFor={`comment-${order.id}`} className="sr-only">Your comment</label>
          <textarea
            id={`comment-${order.id}`}
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

function OrderCard({ order: o, feedback, user }) {
  const [open, setOpen] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const lastStatus = useRef(o.status)

  useEffect(() => {
    if (lastStatus.current !== o.status) {
      lastStatus.current = o.status
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 2500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [o.status])

  const paid = o.paymentStatus === 'paid'
  const refunded = o.paymentStatus === 'refunded'
  const canCancel = o.status === 'requested'
  const ordered = o.createdAt?.toDate?.().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  const reference = o.id.slice(0, 8).toUpperCase()
  const showBreakdown = hasDeliveryCost(o) && !isClosed(o)

  async function pay() {
    setError('')
    setPaying(true)
    try {
      await startPayment('order', o.id)
    } catch (err) {
      console.error(err)
      setError(paymentErrorMessage(err))
      setPaying(false)
    }
  }

  async function cancelOrder() {
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'orders', o.id), { status: 'cancelled', updatedAt: serverTimestamp() })
      notify('order', o.id, 'cancelled')
      setConfirmingCancel(false)
    } catch (err) {
      console.error(err)
      setError('Could not cancel the order. Please try again.')
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
        {o.thumb ? (
          <img src={o.thumb} alt="" className="h-16 w-16 flex-none rounded-xl object-cover sm:h-[72px] sm:w-[72px]" />
        ) : (
          <div
            className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-cream text-gold-deep sm:h-[72px] sm:w-[72px]"
            aria-hidden="true"
          >
            <Icon name="box" size={26} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-emerald-brand">{o.listingTitle}</p>
          <p className="break-words text-sm text-charcoal/70">
            {o.sellerName} · {o.quantity} × {formatZAR(o.priceCents)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status] || STATUS_STYLE.requested}`}>
              {ORDER_STATUS[o.status] || o.status}
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

        <div className="flex-none text-right">
          <p className="text-xs text-charcoal/60">Total</p>
          <p className="text-sm font-semibold text-emerald-brand">{formatZAR(orderTotal(o))}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-charcoal/80">{nextStep(o, Boolean(feedback))}</p>

      {showBreakdown && (
        <div className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span>Items</span>
            <span>{formatZAR(o.totalCents)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Delivery</span>
            <span>{deliveryOf(o) > 0 ? formatZAR(deliveryOf(o)) : o.deliveryType === 'collection' ? 'Collection' : 'Free'}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gold/40 pt-2 font-medium text-emerald-brand">
            <span>Total to pay</span>
            <span>{formatZAR(orderTotal(o))}</span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {confirmingCancel ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4" role="alertdialog" aria-label="Confirm cancellation">
          <p className="text-sm font-medium text-red-800">
            Cancel this order from {o.sellerName}? This cannot be undone.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button disabled={busy} onClick={cancelOrder} className={`${btnDanger} w-full bg-white sm:w-auto`}>
              {busy ? 'Cancelling…' : 'Yes, cancel order'}
            </button>
            <button disabled={busy} onClick={() => setConfirmingCancel(false)} className={`${btnQuiet} w-full bg-white sm:w-auto`}>
              Keep order
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {o.status === 'confirmed' && !paid && (
            <button disabled={paying} onClick={pay} className={`${btnPrimary} w-full sm:w-auto`}>
              {paying ? 'Opening PayFast…' : `Pay now · ${formatZAR(orderTotal(o))}`}
            </button>
          )}
          {canCancel && (
            <button onClick={() => setConfirmingCancel(true)} className={`${btnQuiet} w-full sm:w-auto`}>
              Cancel order
            </button>
          )}
          {o.status === 'declined' && (
            <Link to="/shop" className={`${btnGold} w-full sm:w-auto`}>
              Find another product
            </Link>
          )}
          {o.status === 'delivered' && !feedback && (
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

      {o.status === 'delivered' && !feedback && showFeedback && <FeedbackForm order={o} user={user} />}

      {o.status === 'delivered' && feedback && (
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-emerald-brand">
          {feedback.satisfied
            ? 'Thank you for your feedback. We are glad you were happy.'
            : 'Thank you for telling us. We take service seriously and will look into this.'}
        </p>
      )}

      {open && (
        <div className="mt-4 border-t border-gold/40 pt-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Ordered" value={ordered} />
            <DetailRow label="Supplier" value={o.sellerName} />
            <DetailRow label="Quantity" value={o.quantity ? String(o.quantity) : ''} />
            <DetailRow label="Unit price" value={formatZAR(o.priceCents)} />
            <DetailRow label="Items total" value={formatZAR(o.totalCents)} />
            <DetailRow label="Delivery option" value={deliveryTypeLabel(o)} />
            <DetailRow label="Delivery cost" value={hasDeliveryCost(o) ? formatZAR(deliveryOf(o)) : ''} />
            <DetailRow label="Total" value={formatZAR(orderTotal(o))} />
            <DetailRow label="Payment" value={paid ? 'Paid' : refunded ? 'Refunded' : 'Not paid'} />
            <DetailRow label="Order reference" value={reference} />
          </dl>
          <RefundRequest kind="order" item={o} />
        </div>
      )}
    </li>
  )
}

function Skeleton() {
  return (
    <ul className="flex flex-col gap-4" role="status" aria-label="Loading orders">
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-2xl border border-gold/30 bg-white p-5">
          <div className="flex gap-4">
            <div className="h-[72px] w-[72px] rounded-xl bg-cream" />
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
  active: 'No active orders.',
  past: 'No delivered orders yet.',
  closed: 'No cancelled or declined orders.',
}

export default function MyOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'orders'), where('buyerId', '==', user.uid)),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setOrders(items)
        },
        (err) => {
          console.error(err)
          setError('Could not load your orders. Please refresh and try again.')
          setOrders([])
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
      await downloadWorkbook(`zolara-my-orders-${stampDate()}.xlsx`, [
        {
          name: 'My orders',
          title: 'Zolara · My orders',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}`,
          columns: [
            { header: 'Ordered', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Item', key: 'item', width: 30 },
            { header: 'Supplier', key: 'supplier', width: 26 },
            { header: 'Quantity', key: 'quantity', type: 'number', width: 10 },
            { header: 'Unit price', key: 'price', type: 'cents', width: 16 },
            { header: 'Items total', key: 'items', type: 'cents', width: 16 },
            { header: 'Delivery', key: 'delivery', type: 'cents', width: 16 },
            { header: 'Total', key: 'total', type: 'cents', width: 16 },
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Payment', key: 'payment', width: 14 },
            { header: 'Satisfied', key: 'satisfied', width: 12 },
            { header: 'Your feedback', key: 'comment', width: 40 },
          ],
          rows: orders.map((o) => {
            const f = feedback[o.id]
            return {
              createdAt: o.createdAt,
              item: o.listingTitle,
              supplier: o.sellerName,
              quantity: o.quantity,
              price: o.priceCents,
              items: o.totalCents,
              delivery: deliveryOf(o),
              total: orderTotal(o),
              status: ORDER_STATUS[o.status] || o.status,
              payment: o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid',
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

  const list = orders || []
  const groups = {
    action: list.filter((o) => (o.status === 'confirmed' && o.paymentStatus !== 'paid') || (o.status === 'delivered' && !feedback[o.id])),
    active: list.filter((o) => o.status !== 'delivered' && !isClosed(o)),
    past: list.filter((o) => o.status === 'delivered'),
    closed: list.filter(isClosed),
  }
  const tabs = [
    ['action', 'Action needed', groups.action.length, true],
    ['active', 'Active', groups.active.length, false],
    ['past', 'Delivered', groups.past.length, false],
    ['closed', 'Cancelled / declined', groups.closed.length, false],
  ]
  const activeTab = tab || (groups.action.length > 0 ? 'action' : 'active')

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">My orders</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Track your orders, pay for confirmed ones and tell us how they went.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={download}
              disabled={!orders || orders.length === 0}
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

        {!orders ? (
          <Skeleton />
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-emerald-brand">No orders yet</p>
            <p className="mt-2 text-sm text-charcoal/70">When you buy a product, it will show up here.</p>
            <Link to="/shop" className={`${btnPrimary} mt-5`}>
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div
              className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
              role="group"
              aria-label="Order sections"
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
                {activeTab === 'active' && (
                  <Link to="/shop" className={`${btnPrimary} mt-4`}>
                    Browse products
                  </Link>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {groups[activeTab].map((o) => (
                  <OrderCard key={o.id} order={o} feedback={feedback[o.id]} user={user} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}