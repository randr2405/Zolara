import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatZAR } from '../lib/constants.js'
import { REFUND_STATUS, listRefunds, processRefund, refundErrorMessage } from '../lib/refunds.js'

const FILTERS = [
  ['requested', 'Open'],
  ['all', 'All'],
]

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState(null)
  const [filter, setFilter] = useState('requested')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setRefunds(await listRefunds())
    } catch (err) {
      console.error(err)
      setError('Could not load refund requests.')
      setRefunds([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function act(r, action) {
    const prompt =
      action === 'refund'
        ? 'Only continue once you have refunded this payment in your PayFast dashboard. Note for the customer (optional):'
        : 'Decline this refund request. Note for the customer (optional):'
    const note = window.prompt(prompt)
    if (note === null) return
    setBusyId(r.id)
    setError('')
    try {
      await processRefund(r.id, action, note)
      await load()
    } catch (err) {
      console.error(err)
      setError(refundErrorMessage(err))
    } finally {
      setBusyId('')
    }
  }

  if (!refunds) return <p className="p-6 text-center">Loading…</p>

  const shown = refunds.filter((r) => filter === 'all' || r.status === filter)

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-emerald-brand">Refund requests</h1>
        <Link to="/admin" className="text-sm text-emerald-brand underline">Back to admin</Link>
      </div>

      <div className="mb-4 flex gap-3">
        {FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`rounded-full px-4 py-2 text-sm ${
              filter === v ? 'bg-emerald-brand text-cream' : 'border border-gold-deep text-gold-deep'}`}>
            {label}
          </button>
        ))}
      </div>

      <p className="mb-6 rounded-lg bg-white p-3 text-xs">
        To refund: find the payment in your PayFast dashboard using the PayFast payment ID shown
        below and refund it there, then press Mark as refunded. That cancels an unshipped booking or
        order, returns stock for an unshipped order, and removes the sale from the supplier’s balance.
      </p>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {shown.length === 0 && <p className="text-sm">No refund requests.</p>}

      <ul className="flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm">
                  {r.kind === 'order' ? 'Order' : 'Booking'} · {formatZAR(r.amountCents)} · {r.sellerName}
                </p>
                <p className="text-sm">{r.buyerName} · {r.buyerEmail}</p>
                <p className="text-xs text-gold-deep">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-ZA') : ''}
                  {r.pfPaymentId ? ` · PayFast payment ID ${r.pfPaymentId}` : ''}
                  {r.feeCents ? ` · PayFast fee ${formatZAR(r.feeCents)}` : ''}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${
                r.status === 'requested' ? 'bg-red-100 text-red-700' : 'bg-cream'}`}>
                {REFUND_STATUS[r.status] || r.status}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-line text-sm">Reason: {r.reason}</p>
            {r.adminNote && <p className="mt-2 text-xs">Note: {r.adminNote}</p>}

            {r.status === 'requested' && (
              <div className="mt-3 flex flex-wrap gap-3">
                <button disabled={busyId === r.id} onClick={() => act(r, 'refund')}
                  className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream disabled:opacity-60">
                  Mark as refunded
                </button>
                <button disabled={busyId === r.id} onClick={() => act(r, 'reject')}
                  className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700 disabled:opacity-60">
                  Decline
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}