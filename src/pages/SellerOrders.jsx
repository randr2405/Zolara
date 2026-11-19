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

  async function run(fn) {
    setError('')
    try {
      await fn()
    } catch (err) {
      console.error(err)
      if (err.message === 'stock') setError('Not enough stock left to accept this order.')
      else if (err.message === 'status') setError('This order has already changed. Please refresh.')
      else setError('Could not update the order. Please try again.')
    }
  }

  if (!orders) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-brand">Orders</h1>
        <Link to="/seller" className="text-sm text-emerald-brand underline">Back to dashboard</Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {orders.length === 0 && <p className="text-sm">No orders yet.</p>}

      <ul className="flex flex-col gap-3">
        {orders.map((o) => (
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
              <span className="rounded-full bg-cream px-3 py-1 text-xs">{ORDER_STATUS[o.status]}</span>
            </div>

            <div className="mt-2 text-sm">
              <p>Customer: {o.buyerName}</p>
              <p>Phone: {o.buyerPhone} · Email: {o.buyerEmail}</p>
              <p className="whitespace-pre-line">Deliver to: {o.address}</p>
              {o.notes && <p className="whitespace-pre-line">Notes: {o.notes}</p>}
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {o.status === 'requested' && (
                <>
                  <button onClick={() => run(() => acceptOrder(o))}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Accept</button>
                  <button onClick={() => window.confirm('Decline this order?') && run(() => setStatus(o.id, 'declined'))}
                    className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700">Decline</button>
                </>
              )}
              {o.status === 'confirmed' && (
                <>
                  <button onClick={() => window.confirm('Mark this order as shipped?') && run(() => setStatus(o.id, 'shipped'))}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Mark as shipped</button>
                  <button onClick={() => window.confirm('Cancel this order? The stock will be returned.') && run(() => cancelConfirmedOrder(o))}
                    className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700">Cancel order</button>
                </>
              )}
              {o.status === 'shipped' && (
                <button onClick={() => window.confirm('Mark this order as delivered?') && run(() => setStatus(o.id, 'delivered'))}
                  className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Mark as delivered</button>
              )}
            </div>

            {feedback[o.id] && <SellerFeedback docId={o.id} data={feedback[o.id]} />}
          </li>
        ))}
      </ul>
    </main>
  )
}