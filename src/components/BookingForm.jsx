import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { NOTICE_VERSION, SERVICE_NOTICE } from '../lib/bookings.js'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

function todayLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export default function BookingForm() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(undefined)
  const [form, setForm] = useState({ date: '', time: '', phone: '', notes: '' })
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    getDoc(doc(db, 'listings', id))
      .then((s) => setListing(s.exists() && s.data().type === 'service' ? s.data() : null))
      .catch(() => setListing(null))
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addDoc(collection(db, 'bookings'), {
        listingId: id,
        listingTitle: listing.title,
        priceCents: listing.priceCents,
        durationMinutes: listing.durationMinutes,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        buyerId: user.uid,
        buyerName: profile?.displayName || user.email,
        buyerEmail: user.email,
        buyerPhone: form.phone,
        date: form.date,
        time: form.time,
        notes: form.notes,
        status: 'requested',
        noticeVersion: NOTICE_VERSION,
        noticeAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
      navigate('/bookings')
    } catch (err) {
      console.error(err)
      setError('Could not send your booking request. Please try again.')
      setBusy(false)
    }
  }

  if (listing === undefined) return <p className="p-6 text-center">Loading…</p>
  if (listing === null) return <p className="p-6 text-center">This service isn’t available.</p>
  if (listing.sellerId === user.uid) {
    return <p className="p-6 text-center">You can’t book your own service.</p>
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Book this service</h1>
      <p className="mb-6 text-sm">
        {listing.title} · {formatZAR(listing.priceCents)} · {listing.durationMinutes} minutes · {listing.sellerName}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input required type="date" min={todayLocal()} value={form.date}
            onChange={set('date')} className={input} />
          <input required type="time" value={form.time} onChange={set('time')} className={input} />
        </div>
        <input required type="tel" placeholder="Your phone number" value={form.phone}
          onChange={set('phone')} className={input} />
        <textarea rows={4} placeholder="Where should the service happen, and anything the supplier should know?"
          value={form.notes} onChange={set('notes')} className={input} />

        <div className="rounded-xl border border-gold-deep bg-white p-4 text-xs leading-relaxed">
          <p className="mb-2 text-sm font-semibold text-emerald-brand">Please read before you book</p>
          {SERVICE_NOTICE.map((p) => <p key={p} className="mb-2">{p}</p>)}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
          <span>I have read and understood the notice above.</span>
        </label>

        <p className="text-xs">
          This sends a request to the supplier. No payment is taken on Zolara yet, so the supplier
          will contact you to confirm the details and arrange payment.
        </p>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Sending…' : 'Send booking request'}
        </button>
        <Link to={`/listing/${id}`} className="text-center text-sm text-emerald-brand underline">
          Back to listing
        </Link>
      </form>
    </main>
  )
}