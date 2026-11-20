import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import SellerFeedback from '../components/SellerFeedback.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_STATUS } from '../lib/orders.js'
import { notify } from '../lib/notify.js'
import {
  STATUS_SUMMARY_COLUMNS, downloadWorkbook, stampDate, summaryByStatus,
} from '../lib/reportExport.js'

const setStatus = (id, status) =>
  updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() })

async function acceptOrder(order) {
  await runTransaction(db, async (tx) => {
    const listingRef = doc(db, 'listings', order.listingId)
    const orderRef = doc(db, 'orders', order.id)
    const listing = await tx.get(listingRef)
    const current = await tx.get(orderRef)
    if (!current.exists() || current.data().status !== 'requested') throw new Error('status')
    if (!listing.exists()) throw new Error('listing')
    const stock = listing.data().stock ?? 0
    if (stock < order.quantity) throw new Error('stock')
    tx.update(listingRef, { stock: stock - order.quantity })
    tx.update(orderRef, { status: 'confirmed', updatedAt: serverTimestamp() })
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
      tx.update(listingRef, { stock: (listing.data().stock ?? 0) + order.quantity })
    }
    tx.update(orderRef, { status: 'cancelled', updatedAt: serverTimestamp() })
  })
}

export default function SellerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'orders'), where('sellerId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setOrders(items)
      }),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'feedback'), where('sellerId', '==', user.uid)), (snap) => {
        const map = {}
        snap.docs.forEach((d) => { map[d.id] = d.data() })
        setFeedback(map)
      }),
    [user.uid]
  )

  // fn does the update; if it works, the matching email event is sent for order `id`.
  async function run(fn, id, event) {
    setError('')
    try {
      await fn()
      if (event) notify('order', id, event)
    } catch (err) {
      console.error(err)
      if (err.message === 'stock') setError('Not enough stock left to accept this order.')
      else if (err.message === 'status') setError('This order has already changed. Please refresh.')
      else if (err.message === 'paid') setError('This order has been paid. Please contact the Zolara team to cancel it.')
      else setError('Could not update the order. Please try again.')
    }
  }

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
            { header: 'Quantity', key: 'quantity', type: 'number', width: 10 },
            { header: 'Unit price', key: 'price', type: 'cents', width: 16 },
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
            quantity: o.quantity,
            price: o.priceCents,
            total: o.totalCents,
            status: ORDER_STATUS[o.status] || o.status,
            payment: o.paymentStatus === 'paid' ? 'Paid' : 'Not paid',
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
          subtitle: 'Value is the total order amount for each status.',
          columns: STATUS_SUMMARY_COLUMNS,
          rows: summaryByStatus(orders, ORDER_STATUS, (o) => o.totalCents || 0),
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Could not build the Excel file.')
    }
  }

  if (!orders) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-emerald-brand">Orders</h1>
        <div className="flex items-center gap-4">
          <button onClick={download} disabled={orders.length === 0}
            className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
            Download Excel
          </button>
          <Link to="/seller" className="text-sm text-emerald-brand underline">Back to dashboard</Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {orders.length === 0 && <p className="text-sm">No orders yet.</p>}

      <ul className="flex flex-col gap-3">
        {orders.map((o) => {
          const paid = o.paymentStatus === 'paid'
          return (
            <li key={o.id} className="rounded-xl bg-white p-4">
              <div className="flex items-start gap-3">
                {o.thumb
                  ? <img src={o.thumb} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  : <div className="h-16 w-16 rounded-lg bg-cream" />}
                <div className="flex-1">
                  <p className="font-medium">{o.listingTitle}</p>
                  <p className="text-sm">{o.quantity} × {formatZAR(o.priceCents)}</p>
                  <p className="text-sm text-gold-deep">Total {formatZAR(o.totalCents)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-cream px-3 py-1 text-xs">{ORDER_STATUS[o.status]}</span>
                  {paid && <span className="rounded-full bg-cream px-3 py-1 text-xs text-emerald-brand">Paid</span>}
                </div>
              </div>

              <div className="mt-2 text-sm">
                <p>Customer: {o.buyerName}</p>
                <p>Phone: {o.buyerPhone} · Email: {o.buyerEmail}</p>
                <p className="whitespace-pre-line">Deliver to: {o.address}</p>
                {o.notes && <p className="whitespace-pre-line">Notes: {o.notes}</p>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {o.status === 'requested' && (
                  <>
                    <button onClick={() => run(() => acceptOrder(o), o.id, 'confirmed')}
                      className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Accept</button>
                    <button onClick={() => window.confirm('Decline this order?') && run(() => setStatus(o.id, 'declined'), o.id, 'declined')}
                      className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700">Decline</button>
                  </>
                )}
                {o.status === 'confirmed' && !paid && (
                  <>
                    <p className="text-sm text-gold-deep">Waiting for the customer to pay.</p>
                    <button onClick={() => window.confirm('Cancel this order? The stock will be returned.') && run(() => cancelConfirmedOrder(o), o.id, 'cancelled')}
                      className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700">Cancel order</button>
                  </>
                )}
                {o.status === 'confirmed' && paid && (
                  <button onClick={() => window.confirm('Mark this order as shipped?') && run(() => setStatus(o.id, 'shipped'), o.id, 'shipped')}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Mark as shipped</button>
                )}
                {o.status === 'shipped' && (
                  <button onClick={() => window.confirm('Mark this order as delivered?') && run(() => setStatus(o.id, 'delivered'), o.id, 'delivered')}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Mark as delivered</button>
                )}
              </div>

              {feedback[o.id] && <SellerFeedback docId={o.id} data={feedback[o.id]} />}
            </li>
          )
        })}
      </ul>
    </main>
  )
}