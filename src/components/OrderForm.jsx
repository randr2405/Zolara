import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { ORDER_NOTICE, ORDER_NOTICE_VERSION } from '../lib/orders.js'
import { deliverySummary } from '../lib/delivery.js'
import { notify } from '../lib/notify.js'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

export default function OrderForm() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(undefined)
  const [form, setForm] = useState({ quantity: '1', size: '', phone: '', address: '', notes: '' })
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

  const sizes = Array.isArray(listing?.sizes) ? listing.sizes : []
  const hasSizes = sizes.length > 0
  const chosen = hasSizes ? sizes.find((s) => s.label === form.size) : null
  const available = hasSizes ? (chosen ? chosen.stock ?? 0 : 0) : listing?.stock ?? 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (hasSizes && !chosen) return setError('Please choose a size.')
    const quantity = parseInt(form.quantity, 10)
    if (!quantity || quantity < 1) return setError('Please enter a valid quantity.')
    if (quantity > available) {
      return setError(hasSizes ? `Only ${available} left in size ${chosen.label}.` : `Only ${available} in stock.`)
    }
    setBusy(true)
    setError('')
    try {
      const ref = await addDoc(collection(db, 'orders'), {
        listingId: id,
        listingTitle: listing.title,
        thumb: listing.thumb || null,
        quantity,
        size: hasSizes ? chosen.label : null,
        priceCents: listing.priceCents,
        totalCents: listing.priceCents * quantity,
        deliveryType: listing.deliveryType || null,
        deliveryQuoteCents: listing.deliveryType === 'flat' ? listing.deliveryFeeCents || 0 : 0,
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
      notify('order', ref.id, 'requested')
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
  const itemsCents = listing.priceCents * quantity
  const type = listing.deliveryType
  const collection_ = type === 'collection'
  const flatCents = type === 'flat' ? listing.deliveryFeeCents || 0 : 0

  let deliveryLine = 'Confirmed by the supplier when they accept your order'
  if (collection_) deliveryLine = 'None. You collect from the supplier'
  else if (type === 'free') deliveryLine = 'Free'
  else if (type === 'flat') deliveryLine = formatZAR(flatCents)

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Order this product</h1>
      <p className="mb-2 text-sm">
        {listing.title} · {formatZAR(listing.priceCents)} each · {listing.stock} in stock · {listing.sellerName}
      </p>
      <p className="mb-6 text-sm text-gold-deep">{deliverySummary(listing)}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {hasSizes && (
          <label className="text-sm">
            Size
            <select
              required
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value, quantity: '1' })}
              className={`${input} mt-1 block w-full`}
            >
              <option value="">Choose a size</option>
              {sizes.map((s) => (
                <option key={s.label} value={s.label} disabled={(s.stock ?? 0) < 1}>
                  {s.label}{(s.stock ?? 0) < 1 ? ' (sold out)' : ` (${s.stock} left)`}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          Quantity
          <input required type="number" min="1" max={hasSizes ? Math.max(available, 1) : listing.stock} step="1"
            value={form.quantity} onChange={set('quantity')} className={`${input} mt-1 block w-full`} />
        </label>
        <input required type="tel" placeholder="Your phone number" value={form.phone}
          onChange={set('phone')} className={input} />
        <textarea required={!collection_} rows={3}
          placeholder={collection_ ? 'Your address (optional, you will collect)' : 'Delivery address'}
          value={form.address} onChange={set('address')} className={input} />
        <textarea rows={3} placeholder="Anything the supplier should know? (optional)" value={form.notes}
          onChange={set('notes')} className={input} />

        <div className="rounded-xl border border-gold/50 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span>Items</span>
            <span>{formatZAR(itemsCents)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <span>Delivery</span>
            <span className="text-right">{deliveryLine}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gold/30 pt-2 font-medium text-emerald-brand">
            <span>{type === 'flat' || type === 'free' || collection_ ? 'Total to pay' : 'Items total'}</span>
            <span>{formatZAR(itemsCents + flatCents)}</span>
          </div>
          <p className="mt-2 text-xs text-charcoal/70">
            You pay only after the supplier accepts. If the delivery cost changes, you will see the final total before you pay.
          </p>
        </div>

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