import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_NOTICE, ORDER_NOTICE_VERSION } from '../lib/orders.js'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

export default function OrderForm() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(undefined)
  const [form, setForm] = useState({ quantity: '1', phone: '', address: '', notes: '' })
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    getDoc(doc(db, 'listings', id))
      .then((s) => {
        const d = s.exists() ? s.data() : null
        setListing(d && d.type === 'product' && d.active && d.sellerApproved ? d : null)
      })
      .catch(() => setListing(null))
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    const quantity = parseInt(form.quantity, 10)
    if (!quantity || quantity < 1) return setError('Please enter a valid quantity.')
    if (quantity > (listing.stock ?? 0)) return setError(`Only ${listing.stock} in stock.`)
    setBusy(true)
    setError('')
    try {
      await addDoc(collection(db, 'orders'), {
        listingId: id,
        listingTitle: listing.title,
        thumb: listing.thumb || null,
        quantity,
        priceCents: listing.priceCents,
        totalCents: listing.priceCents * quantity,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        buyerId: user.uid,
        buyerName: profile?.displayName || user.email,
        buyerEmail: user.email,
        buyerPhone: form.phone,
        address: form.address,
        notes: form.notes,
        status: 'requested',
        noticeVersion: ORDER_NOTICE_VERSION,
        noticeAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
      navigate('/my-orders')
    } catch (err) {
      console.error(err)
      setError('Could not send your order. Please try again.')
      setBusy(false)
    }
  }

  if (listing === undefined) return <p className="p-6 text-center">Loading…</p>
  if (listing === null) return <p className="p-6 text-center">This product isn’t available.</p>
  if (listing.sellerId === user.uid) return <p className="p-6 text-center">You can’t order your own product.</p>
  if (!listing.stock || listing.stock < 1) return <p className="p-6 text-center">This product is out of stock.</p>

  const quantity = parseInt(form.quantity, 10) || 0

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Order this product</h1>
      <p className="mb-6 text-sm">
        {listing.title} · {formatZAR(listing.priceCents)} each · {listing.stock} in stock · {listing.sellerName}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm">
          Quantity
          <input required type="number" min="1" max={listing.stock} step="1" value={form.quantity}
            onChange={set('quantity')} className={`${input} mt-1 block w-full`} />
        </label>
        <input required type="tel" placeholder="Your phone number" value={form.phone}
          onChange={set('phone')} className={input} />
        <textarea required rows={3} placeholder="Delivery address" value={form.address}
          onChange={set('address')} className={input} />
        <textarea rows={3} placeholder="Anything the supplier should know? (optional)" value={form.notes}
          onChange={set('notes')} className={input} />

        <p className="text-sm font-medium text-emerald-brand">
          Total: {formatZAR(listing.priceCents * quantity)}
        </p>

        <div className="rounded-xl border border-gold-deep bg-white p-4 text-xs leading-relaxed">
          <p className="mb-2 text-sm font-semibold text-emerald-brand">Please read before you order</p>
          {ORDER_NOTICE.map((p) => <p key={p} className="mb-2">{p}</p>)}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
          <span>I have read and understood the notice above.</span>
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Sending…' : 'Send order request'}
        </button>
        <Link to={`/listing/${id}`} className="text-center text-sm text-emerald-brand underline">
          Back to listing
        </Link>
      </form>
    </main>
  )
}