import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'

const TYPE_LABEL = {
  access: 'Copy of my data',
  correction: 'Correct my data',
  deletion: 'Delete my account',
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

function YourData({ user, profile }) {
  const [requests, setRequests] = useState([])
  const [type, setType] = useState('access')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'dataRequests'), where('userId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setRequests(items)
      }),
    [user.uid]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (type === 'deletion' && !window.confirm('Request deletion of your account and personal information?')) return
    setBusy(true)
    setError('')
    setSent(false)
    try {
      await addDoc(collection(db, 'dataRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || user.email,
        type,
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setMessage('')
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('Could not send your request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadPayments() {
    setError('')
    try {
      const seller = profile?.role === 'seller'
      const snap = await getDocs(
        query(collection(db, 'payments'), where(seller ? 'sellerId' : 'buyerId', '==', user.uid))
      )
      const rows = snap.docs
        .map((d) => d.data())
        .filter((p) => p.status !== 'pending')
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      const header = [
        'Date', 'Item', 'Type', seller ? 'Customer paid (R)' : 'Amount (R)',
        ...(seller ? ['PayFast fee (R)'] : []), 'Status',
      ]
      const lines = rows.map((p) => [
        (p.paidAt || p.createdAt)?.toDate?.().toISOString().slice(0, 10) || '',
        p.title,
        p.kind,
        (p.amountCents || 0) / 100,
        ...(seller ? [(p.feeCents || 0) / 100] : []),
        p.status,
      ])
      const csv = [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-zolara-payments.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Could not build your payment records.')
    }
  }

  const hasOpen = requests.some((r) => r.type === type && r.status === 'open')

  return (
    <section className="mt-8 rounded-xl bg-white p-4">
      <h2 className="mb-1 text-lg font-semibold text-emerald-brand">Your data</h2>
      <p className="mb-4 text-xs">
        You can ask us for a copy of the personal information we hold about you, ask us to correct it,
        or ask us to delete your account. We aim to respond within 30 days. For some requests we may
        need to confirm it is really you. We may keep records we are legally required to keep, such as
        bookings, orders and payments.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select value={type} onChange={(e) => { setType(e.target.value); setSent(false) }}
          className="rounded-lg border border-gold/50 bg-white p-3 text-sm">
          {Object.entries(TYPE_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={type === 'correction' ? 'What should be corrected?' : 'Anything we should know? (optional)'}
          className="rounded-lg border border-gold/50 bg-white p-3 text-sm" />
        {hasOpen && <p className="text-xs">You already have an open request of this kind.</p>}
        {sent && <p className="text-sm text-emerald-brand">Request sent. We will be in touch.</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy || hasOpen}
          className="self-start rounded-full bg-emerald-brand px-6 py-3 text-sm text-cream disabled:opacity-60">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </form>

      <div className="mt-4 border-t border-gold/40 pt-3">
        <p className="mb-2 text-xs">Download your payment records now, without sending a request.</p>
        <button type="button" onClick={downloadPayments}
          className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep">
          Download my payment records
        </button>
      </div>

      {requests.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-gold/40 pt-3 text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span>
                {TYPE_LABEL[r.type]}
                <span className="ml-2 text-xs text-gold-deep">
                  {r.createdAt?.toDate?.().toLocaleDateString('en-ZA')}
                </span>
              </span>
              <span className="rounded-full bg-cream px-3 py-1 text-xs">
                {r.status === 'done' ? 'Done' : 'Open'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Account() {
  const { user, profile } = useAuth()
  const isSeller = profile?.role === 'seller'
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">
        {profile?.displayName || 'Your account'}
      </h1>
      <p className="mb-1 text-sm">{user?.email}</p>
      <p className="mb-6 text-sm text-gold-deep">
        {isSeller ? 'Seller account' : 'Buyer account'}
      </p>
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
        {isSeller ? (
          <>
            <Link to="/seller" className="text-emerald-brand underline">Go to your seller dashboard</Link>
            <Link to="/seller/bookings" className="text-emerald-brand underline">Manage your bookings</Link>
            <Link to="/seller/orders" className="text-emerald-brand underline">Manage your orders</Link>
            <Link to="/seller/payments" className="text-emerald-brand underline">Payments and banking details</Link>
          </>
        ) : (
          <>
            <Link to="/my-bookings" className="text-emerald-brand underline">View your bookings</Link>
            <Link to="/my-orders" className="text-emerald-brand underline">View your orders</Link>
            <Link to="/shop" className="text-emerald-brand underline">Browse the shop</Link>
          </>
        )}
      </div>

      <YourData user={user} profile={profile} />
    </main>
  )
}