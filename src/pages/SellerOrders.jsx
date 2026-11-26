import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import SellerFeedback from '../components/SellerFeedback.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_STATUS } from '../lib/orders.js'
import { deliveryIsEditable, deliveryOf, hasDeliveryCost, orderTotal } from '../lib/delivery.js'
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
  shipped: 'bg-cream text-emerald-brand ring-1 ring-emerald-brand/40',
  delivered: 'bg-cream text-charcoal/70 ring-1 ring-charcoal/20',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
}

const ICONS = {
  chevron: 'M6 9l6 6 6-6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  back: 'M15 6l-6 6 6 6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
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

const setStatus = (id, status) =>
  updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() })

async function acceptOrder(order, deliveryCents) {
  await runTransaction(db, async (tx) => {
    const listingRef = doc(db, 'listings', order.listingId)
    const orderRef = doc(db, 'orders', order.id)
    const listing = await tx.get(listingRef)
    const current = await tx.get(orderRef)
    if (!current.exists() || current.data().status !== 'requested') throw new Error('status')
    if (!listing.exists()) throw new Error('listing')
    const data = listing.data()
    const sizes = Array.isArray(data.sizes) ? data.sizes : []
    if (order.size && sizes.length > 0) {
      const idx = sizes.findIndex((s) => s.label === order.size)
      if (idx < 0 || (sizes[idx].stock ?? 0) < order.quantity) throw new Error('stock')
      const next = sizes.map((s, i) => (i === idx ? { ...s, stock: s.stock - order.quantity } : s))
      tx.update(listingRef, {
        sizes: next,
        stock: next.reduce((n, s) => n + (s.stock ?? 0), 0),
      })
    } else {
      const stock = data.stock ?? 0
      if (stock < order.quantity) throw new Error('stock')
      tx.update(listingRef, { stock: stock - order.quantity })
    }
    tx.update(orderRef, {
      status: 'confirmed',
      deliveryCents,
      grandTotalCents: current.data().totalCents + deliveryCents,
      updatedAt: serverTimestamp(),
    })
  })
}

async function cancelConfirmedOrder(order) {
  await runTransaction(db, async (tx) => {
    const listingRef = doc(db, 'listings', order.listingId)
    const orderRef = doc(db, 'orders', order.id)
    const listing = await tx.get(listingRef)
    const current = await tx.get(orderRef)
    if (!current.exists() || current.data().status !== 'confirmed') throw new Error('status')
    if (current.data().paymentStatus === 'paid') throw new Error('paid')
    if (listing.exists()) {
      const data = listing.data()
      const sizes = Array.isArray(data.sizes) ? data.sizes : []
      const idx = order.size ? sizes.findIndex((s) => s.label === order.size) : -1
      if (idx >= 0) {
        const next = sizes.map((s, i) => (i === idx ? { ...s, stock: (s.stock ?? 0) + order.quantity } : s))
        tx.update(listingRef, {
          sizes: next,
          stock: next.reduce((n, s) => n + (s.stock ?? 0), 0),
        })
      } else {
        tx.update(listingRef, { stock: (data.stock ?? 0) + order.quantity })
      }
    }
    tx.update(orderRef, { status: 'cancelled', updatedAt: serverTimestamp() })
  })
}

const isClosed = (o) => o.status === 'declined' || o.status === 'cancelled'
const readyToShip = (o) => o.status === 'confirmed' && o.paymentStatus === 'paid' && o.refundStatus !== 'requested'
const readyToDeliver = (o) =>
  o.status === 'shipped' && o.refundStatus !== 'requested' && o.paymentStatus !== 'refunded'

function nextStep(o) {
  const paid = o.paymentStatus === 'paid'
  const refundAsked = o.refundStatus === 'requested'
  if (o.status === 'requested') return 'New order. Accepting it reserves the stock and confirms the delivery cost.'
  if (o.status === 'confirmed' && !paid) return 'Waiting for the customer to pay.'
  if (o.status === 'confirmed' && paid && refundAsked) return 'Paid, but the customer has requested a refund. Do not ship yet.'
  if (o.status === 'confirmed' && paid) return 'Paid. Ship the order, then mark it as shipped.'
  if (o.status === 'shipped' && refundAsked) return 'Shipped, and the customer has requested a refund.'
  if (o.status === 'shipped') return 'Shipped. Mark it as delivered once it arrives.'
  if (o.status === 'delivered') return 'Delivered.'
  if (o.status === 'declined') return 'You declined this order.'
  if (o.status === 'cancelled') return 'This order was cancelled.'
  return ORDER_STATUS[o.status] || ''
}

function deliveryTypeLabel(o) {
  if (o.deliveryType === 'collection') return 'Collection only'
  if (o.deliveryType === 'free') return 'Free delivery'
  if (o.deliveryType === 'flat') return 'Flat delivery fee'
  return 'To be confirmed'
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

function OrderCard({ order: o, feedback }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [deliveryText, setDeliveryText] = useState(
    o.deliveryQuoteCents ? (o.deliveryQuoteCents / 100).toFixed(2) : ''
  )
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
  const ordered = o.createdAt?.toDate?.().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  const reference = o.id.slice(0, 8).toUpperCase()
  const phoneLink = o.buyerPhone ? `tel:${String(o.buyerPhone).replace(/\s+/g, '')}` : ''
  const editableDelivery = deliveryIsEditable(o)

  async function run(fn, event) {
    setBusy(true)
    setError('')
    try {
      await fn()
      if (event) notify('order', o.id, event)
      setConfirming(null)
    } catch (err) {
      console.error(err)
      if (err.message === 'stock') setError('Not enough stock left to accept this order.')
      else if (err.message === 'status') setError('This order has already changed. Please refresh.')
      else if (err.message === 'paid') setError('This order has been paid. Please contact the Zolara team to cancel it.')
      else setError('Could not update the order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function accept() {
    let cents = 0
    if (editableDelivery) {
      const value = deliveryText.trim() === '' ? 0 : parseFloat(deliveryText)
      if (!Number.isFinite(value) || value < 0 || value > 100000) {
        setError('Enter a valid delivery cost, or 0 if there is none.')
        return
      }
      cents = Math.round(value * 100)
    }
    run(() => acceptOrder(o, cents), 'confirmed')
  }

  const confirmCopy = {
    accept: {
      text: 'Accept this order? The stock is reserved and the customer can then pay.',
      yes: 'Yes, accept',
      danger: false,
      go: accept,
    },
    decline: {
      text: `Decline this order from ${o.buyerName || 'the customer'}? They will be told.`,
      yes: 'Yes, decline',
      danger: true,
      go: () => run(() => setStatus(o.id, 'declined'), 'declined'),
    },
    cancel: {
      text: 'Cancel this order? The stock will be returned.',
      yes: 'Yes, cancel order',
      danger: true,
      go: () => run(() => cancelConfirmedOrder(o), 'cancelled'),
    },
    ship: {
      text: 'Mark this order as shipped?',
      yes: 'Yes, mark shipped',
      danger: false,
      go: () => run(() => setStatus(o.id, 'shipped'), 'shipped'),
    },
    deliver: {
      text: 'Mark this order as delivered? The customer will be asked for feedback.',
      yes: 'Yes, mark delivered',
      danger: false,
      go: () => run(() => setStatus(o.id, 'delivered'), 'delivered'),
    },
  }[confirming]

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
            {o.buyerName || 'Customer'} · {o.quantity} × {formatZAR(o.priceCents)}
            {o.size ? ` · Size ${o.size}` : ''}
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
          {hasDeliveryCost(o) && (
            <p className="text-xs text-charcoal/60">incl. {formatZAR(deliveryOf(o))} delivery</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-charcoal/80">{nextStep(o)}</p>

      {o.address && (
        <div className="mt-3 rounded-xl border-l-4 border-emerald-brand bg-cream px-4 py-3">
          <p className="text-xs font-medium text-gold-deep">
            {o.deliveryType === 'collection' ? 'Customer address' : 'Deliver to'}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-sm">{o.address}</p>
        </div>
      )}
      {o.status === 'requested' && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">
          Delivery on this listing: {deliveryTypeLabel(o)}
          {o.deliveryType === 'flat' ? ` (${formatZAR(o.deliveryQuoteCents || 0)})` : ''}.
        </p>
      )}
      {o.notes && (
        <div className="mt-3 rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
          <p className="text-xs font-medium text-gold-deep">Customer notes</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm">{o.notes}</p>
        </div>
      )}

      {o.refundStatus === 'requested' && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">
          The customer has requested a refund. Please do not ship until Zolara has decided.
        </p>
      )}
      {refunded && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">Zolara refunded this order.</p>
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
          {confirming === 'accept' && editableDelivery && (
            <div className="mt-3">
              <label htmlFor={`delivery-${o.id}`} className="mb-1.5 block text-sm font-medium text-emerald-brand">
                Delivery cost for this order
              </label>
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-gold-deep">
                  R
                </span>
                <input
                  id={`delivery-${o.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={deliveryText}
                  onChange={(e) => setDeliveryText(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-gold/50 bg-white py-3 pl-9 pr-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                />
              </div>
              <p className="mt-1.5 text-xs text-charcoal/70">
                The customer pays this together with the items. Leave it at 0 if there is no delivery cost.
              </p>
            </div>
          )}
          {confirming === 'accept' && !editableDelivery && (
            <p className="mt-2 text-sm text-charcoal/80">
              {o.deliveryType === 'collection'
                ? 'This is a collection only order, so there is no delivery cost.'
                : 'This listing has free delivery, so the customer pays no delivery cost.'}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button
              disabled={busy}
              onClick={confirmCopy.go}
              className={`${confirmCopy.danger ? `${btnDanger} bg-white` : btnPrimary} w-full sm:w-auto`}
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
          {o.status === 'requested' && (
            <>
              <button
                disabled={busy}
                onClick={() => { setError(''); setConfirming('accept') }}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Accept
              </button>
              <button onClick={() => setConfirming('decline')} className={`${btnDanger} w-full sm:w-auto`}>
                Decline
              </button>
            </>
          )}
          {o.status === 'confirmed' && !paid && (
            <button onClick={() => setConfirming('cancel')} className={`${btnDanger} w-full sm:w-auto`}>
              Cancel order
            </button>
          )}
          {readyToShip(o) && (
            <button onClick={() => setConfirming('ship')} className={`${btnPrimary} w-full sm:w-auto`}>
              Mark as shipped
            </button>
          )}
          {readyToDeliver(o) && (
            <button onClick={() => setConfirming('deliver')} className={`${btnPrimary} w-full sm:w-auto`}>
              Mark as delivered
            </button>
          )}
          {phoneLink && (
            <a href={phoneLink} className={`${btnQuiet} w-full gap-2 sm:w-auto`}>
              <Icon name="phone" size={16} />
              Call
            </a>
          )}
          {o.buyerEmail && (
            <a href={`mailto:${o.buyerEmail}`} className={`${btnQuiet} w-full gap-2 sm:w-auto`}>
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

      {feedback && <SellerFeedback docId={o.id} data={feedback} />}

      {open && (
        <div className="mt-4 border-t border-gold/40 pt-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Ordered" value={ordered} />
            <DetailRow label="Size" value={o.size} />
            <DetailRow label="Quantity" value={o.quantity ? String(o.quantity) : ''} />
            <DetailRow label="Unit price" value={formatZAR(o.priceCents)} />
            <DetailRow label="Items total" value={formatZAR(o.totalCents)} />
            <DetailRow label="Delivery option" value={deliveryTypeLabel(o)} />
            <DetailRow label="Delivery cost" value={hasDeliveryCost(o) ? formatZAR(deliveryOf(o)) : ''} />
            <DetailRow label="Total to pay" value={formatZAR(orderTotal(o))} />
            <DetailRow label="Customer" value={o.buyerName} />
            <DetailRow label="Phone" value={o.buyerPhone} />
            <DetailRow label="Email" value={o.buyerEmail} />
            <DetailRow label="Payment" value={paid ? 'Paid' : refunded ? 'Refunded' : 'Not paid'} />
            <DetailRow label="Order reference" value={reference} />
          </dl>
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
  open: 'No open orders.',
  delivered: 'No delivered orders yet.',
  closed: 'No declined or cancelled orders.',
}

export default function SellerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'orders'), where('sellerId', '==', user.uid)),
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
      await downloadWorkbook(`zolara-orders-${stampDate()}.xlsx`, [
        {
          name: 'Orders',
          title: 'Zolara · Your orders',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}`,
          columns: [
            { header: 'Ordered', key: 'createdAt', type: 'datetime', width: 20 },
            { header: 'Item', key: 'item', width: 30 },
            { header: 'Size', key: 'size', width: 10 },
            { header: 'Quantity', key: 'quantity', type: 'number', width: 10 },
            { header: 'Unit price', key: 'price', type: 'cents', width: 16 },
            { header: 'Items total', key: 'items', type: 'cents', width: 16 },
            { header: 'Delivery', key: 'delivery', type: 'cents', width: 16 },
            { header: 'Total', key: 'total', type: 'cents', width: 16 },
            { header: 'Status', key: 'status', width: 20 },
            { header: 'Payment', key: 'payment', width: 14 },
            { header: 'Customer', key: 'customer', width: 24 },
            { header: 'Phone', key: 'phone', width: 16 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Deliver to', key: 'address', width: 40 },
            { header: 'Notes', key: 'notes', width: 40 },
          ],
          rows: orders.map((o) => ({
            createdAt: o.createdAt,
            item: o.listingTitle,
            size: o.size || '',
            quantity: o.quantity,
            price: o.priceCents,
            items: o.totalCents,
            delivery: deliveryOf(o),
            total: orderTotal(o),
            status: ORDER_STATUS[o.status] || o.status,
            payment: o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'refunded' ? 'Refunded' : 'Not paid',
            customer: o.buyerName,
            phone: o.buyerPhone,
            email: o.buyerEmail,
            address: o.address,
            notes: o.notes,
          })),
        },
        {
          name: 'Summary',
          title: 'Zolara · Orders by status',
          subtitle: 'Value is the total order amount for each status, including delivery.',
          columns: STATUS_SUMMARY_COLUMNS,
          rows: summaryByStatus(orders, ORDER_STATUS, (o) => orderTotal(o)),
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Could not build the Excel file.')
    }
  }

  const list = orders || []
  const groups = {
    action: list.filter((o) => o.status === 'requested' || readyToShip(o) || readyToDeliver(o)),
    open: list.filter((o) => o.status !== 'delivered' && !isClosed(o)),
    delivered: list.filter((o) => o.status === 'delivered'),
    closed: list.filter(isClosed),
  }
  const tabs = [
    ['action', 'Action needed', groups.action.length, true],
    ['open', 'Open', groups.open.length, false],
    ['delivered', 'Delivered', groups.delivered.length, false],
    ['closed', 'Declined / cancelled', groups.closed.length, false],
  ]
  const activeTab = tab || (groups.action.length > 0 ? 'action' : 'open')

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
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Orders</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Accept new orders, follow up on payment, then ship and deliver.
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
            <p className="mt-2 text-sm text-charcoal/70">When a customer buys one of your products, it will show up here.</p>
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
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {groups[activeTab].map((o) => (
                  <OrderCard key={o.id} order={o} feedback={feedback[o.id]} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}