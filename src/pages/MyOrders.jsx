import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_STATUS } from '../lib/orders.js'
import { downloadWorkbook, stampDate } from '../lib/reportExport.js'

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

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 border-t border-gold/40 pt-3">
      <p className="text-sm font-medium text-emerald-brand">Were you satisfied with this order?</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setSatisfied(true)}
          className={`rounded-xl border p-3 text-sm ${satisfied === true ? 'border-emerald-brand bg-cream' : 'border-gold/50'}`}>
          Yes, I was happy
        </button>
        <button type="button" onClick={() => setSatisfied(false)}
          className={`rounded-xl border p-3 text-sm ${satisfied === false ? 'border-red-700 bg-cream' : 'border-gold/50'}`}>
          No, there was a problem
        </button>
      </div>
      <textarea rows={3}
        placeholder={satisfied === false ? 'Tell us what went wrong' : 'Anything you would like to add? (optional)'}
        value={comment} onChange={(e) => setComment(e.target.value)}
        className="rounded-lg border border-gold/50 bg-white p-3 text-sm" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy}
        className="self-start rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream disabled:opacity-60">
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}

export default function MyOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'orders'), where('buyerId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setOrders(items)
      }),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'feedback'), where('buyerId', '==', user.uid)), (snap) => {
        const map = {}
        snap.docs.forEach((d) => { map[d.id] = d.data() })
        setFeedback(map)
      }),
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
            { header: 'Total', key: 'total', type: 'cents', width: 16 },
            { header: 'Status', key: 'status', width: 20 },
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
              total: o.totalCents,
              status: ORDER_STATUS[o.status] || o.status,
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

  if (!orders) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-emerald-brand">My orders</h1>
        <button onClick={download} disabled={orders.length === 0}
          className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
          Download Excel
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {orders.length === 0 && (
        <p className="text-sm">
          No orders yet. <Link to="/shop" className="text-emerald-brand underline">Browse products</Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl bg-white p-4">
            <div className="flex items-start gap-3">
              {o.thumb
                ? <img src={o.thumb} alt="" className="h-16 w-16 rounded-lg object-cover" />
                : <div className="h-16 w-16 rounded-lg bg-cream" />}
              <div className="flex-1">
                <p className="font-medium">{o.listingTitle}</p>
                <p className="text-sm">{o.sellerName} · {o.quantity} × {formatZAR(o.priceCents)}</p>
                <p className="text-sm text-gold-deep">Total {formatZAR(o.totalCents)}</p>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-xs">{ORDER_STATUS[o.status]}</span>
            </div>

            {o.status === 'requested' && (
              <button
                onClick={() =>
                  window.confirm('Cancel this order?') &&
                  updateDoc(doc(db, 'orders', o.id), { status: 'cancelled', updatedAt: serverTimestamp() })
                }
                className="mt-3 text-sm text-red-700 underline">
                Cancel order
              </button>
            )}

            {o.status === 'delivered' && !feedback[o.id] && <FeedbackForm order={o} user={user} />}
            {o.status === 'delivered' && feedback[o.id] && (
              <p className="mt-3 border-t border-gold/40 pt-3 text-sm">
                {feedback[o.id].satisfied
                  ? 'Thank you for your feedback. We are glad you were happy.'
                  : 'Thank you for telling us. We take service seriously and will look into this.'}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}