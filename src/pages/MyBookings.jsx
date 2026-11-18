import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { BOOKING_STATUS, formatWhen } from '../lib/bookings.js'

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
      await setDoc(doc(db, 'feedback', booking.id), {
        bookingId: booking.id,
        buyerId: user.uid,
        sellerId: booking.sellerId,
        sellerName: booking.sellerName,
        listingTitle: booking.listingTitle,
        satisfied,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Could not send your feedback. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 border-t border-gold/40 pt-3">
      <p className="text-sm font-medium text-emerald-brand">Were you satisfied with this service?</p>
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

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState(null)
  const [feedback, setFeedback] = useState({})

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'bookings'), where('buyerId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setBookings(items)
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

  if (!bookings) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-emerald-brand">My bookings</h1>

      {bookings.length === 0 && (
        <p className="text-sm">
          No bookings yet. <Link to="/shop" className="text-emerald-brand underline">Browse services</Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{b.listingTitle}</p>
                <p className="text-sm">{b.sellerName} · {formatZAR(b.priceCents)}</p>
                <p className="text-sm text-gold-deep">{formatWhen(b.date, b.time)}</p>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-xs">{BOOKING_STATUS[b.status]}</span>
            </div>

            {(b.status === 'requested' || b.status === 'confirmed') && (
              <button
                onClick={() =>
                  window.confirm('Cancel this booking?') &&
                  updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled', updatedAt: serverTimestamp() })
                }
                className="mt-3 text-sm text-red-700 underline">
                Cancel booking
              </button>
            )}

            {b.status === 'completed' && !feedback[b.id] && <FeedbackForm booking={b} user={user} />}
            {b.status === 'completed' && feedback[b.id] && (
              <p className="mt-3 border-t border-gold/40 pt-3 text-sm">
                {feedback[b.id].satisfied
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