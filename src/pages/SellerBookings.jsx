import { useEffect, useState } from 'react'
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

const setStatus = (id, status) =>
  updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp() })

export default function SellerBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'bookings'), where('sellerId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setBookings(items)
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

  async function act(id, status) {
    setError('')
    try {
      await setStatus(id, status)
      notify('booking', id, status)
    } catch (err) {
      console.error(err)
      setError('Could not update the booking. Please try again.')
    }
  }

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

  if (!bookings) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-emerald-brand">Bookings</h1>
        <div className="flex items-center gap-4">
          <button onClick={download} disabled={bookings.length === 0}
            className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
            Download Excel
          </button>
          <Link to="/seller" className="text-sm text-emerald-brand underline">Back to dashboard</Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {bookings.length === 0 && <p className="text-sm">No booking requests yet.</p>}

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => {
          const paid = b.paymentStatus === 'paid'
          return (
            <li key={b.id} className="rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{b.listingTitle}</p>
                  <p className="text-sm text-gold-deep">{formatWhen(b.date, b.time)} · {formatZAR(b.priceCents)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-cream px-3 py-1 text-xs">{BOOKING_STATUS[b.status]}</span>
                  {paid && <span className="rounded-full bg-cream px-3 py-1 text-xs text-emerald-brand">Paid</span>}
                  {b.paymentStatus === 'refunded' && <span className="rounded-full bg-cream px-3 py-1 text-xs text-gold-deep">Refunded</span>}
                </div>
              </div>

              <div className="mt-2 text-sm">
                <p>Customer: {b.buyerName}</p>
                <p>Phone: {b.buyerPhone} · Email: {b.buyerEmail}</p>
                {b.notes && <p className="whitespace-pre-line">Notes: {b.notes}</p>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {b.status === 'requested' && (
                  <>
                    <button onClick={() => act(b.id, 'confirmed')}
                      className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Accept</button>
                    <button onClick={() => window.confirm('Decline this booking?') && act(b.id, 'declined')}
                      className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700">Decline</button>
                  </>
                )}
                {b.status === 'confirmed' && !paid && (
                  <p className="text-sm text-gold-deep">Waiting for the customer to pay.</p>
                )}
                {b.status === 'confirmed' && paid && b.refundStatus !== 'requested' && (
                  <button onClick={() => window.confirm('Mark this service as completed?') && act(b.id, 'completed')}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">
                    Mark as completed
                  </button>
                )}
              </div>

              {b.refundStatus === 'requested' && (
                <p className="mt-3 text-sm text-gold-deep">
                  The customer has requested a refund. Zolara is reviewing it.
                </p>
              )}
              {b.paymentStatus === 'refunded' && (
                <p className="mt-3 text-sm text-gold-deep">Zolara refunded this booking.</p>
              )}

              {feedback[b.id] && <SellerFeedback docId={b.id} data={feedback[b.id]} />}
            </li>
          )
        })}
      </ul>
    </main>
  )
}