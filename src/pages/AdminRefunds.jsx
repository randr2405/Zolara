import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatZAR } from '../lib/constants.js'
import { REFUND_STATUS, listRefunds, processRefund, refundErrorMessage } from '../lib/refunds.js'

const FILTERS = [
  ['requested', 'Open'],
  ['all', 'All'],
]

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'

function Detail({ label, value, breakAll }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gold-deep">{label}</dt>
      <dd className={`mt-0.5 text-sm ${breakAll ? 'break-all' : 'break-words'}`}>{value}</dd>
    </div>
  )
}

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

  if (!refunds) {
    return (
      <p role="status" className="p-10 text-center text-emerald-brand">
        Loading…
      </p>
    )
  }

  const shown = refunds.filter((r) => filter === 'all' || r.status === filter)
  const openCount = refunds.filter((r) => r.status === 'requested').length

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Refund requests</h1>
            <p className="mt-2 text-sm text-cream/85 sm:text-base">
              {openCount === 0 ? 'Nothing waiting for you.' : `${openCount} waiting for a decision.`}
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex min-h-[44px] items-center rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            Back to admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <p className="mb-6 rounded-2xl border border-gold/50 border-l-4 border-l-gold bg-white p-4 text-sm leading-relaxed sm:p-5">
          To refund: find the payment in your PayFast dashboard using the PayFast payment ID shown
          below and refund it there, then press Mark as refunded. That cancels an unshipped booking or
          order, returns stock for an unshipped order, and removes the sale from the supplier’s balance.
        </p>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter refund requests">
          {FILTERS.map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              aria-pressed={filter === v}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                filter === v
                  ? 'bg-emerald-brand text-cream'
                  : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  v === 'requested' && openCount > 0
                    ? 'bg-gold text-emerald-brand'
                    : filter === v
                      ? 'bg-cream/20 text-cream'
                      : 'bg-cream text-gold-deep'}`}
              >
                {v === 'requested' ? openCount : refunds.length}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {shown.length === 0 && (
          <p className="rounded-2xl border border-gold/40 bg-white p-6 text-center text-sm">No refund requests.</p>
        )}

        <ul className="flex flex-col gap-4">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-emerald-brand">{r.title}</p>
                  <p className="mt-0.5 text-sm text-gold-deep">{r.kind === 'order' ? 'Order' : 'Booking'}</p>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      r.status === 'requested'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-cream text-gold-deep ring-1 ring-gold/60'}`}
                  >
                    {REFUND_STATUS[r.status] || r.status}
                  </span>
                  <p className="font-display text-xl font-semibold text-emerald-brand">{formatZAR(r.amountCents)}</p>
                </div>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-gold/30 pt-4 sm:grid-cols-2">
                <Detail label="Customer" value={[r.buyerName, r.buyerEmail].filter(Boolean).join(' · ')} breakAll />
                <Detail label="Supplier" value={r.sellerName} />
                <Detail label="Requested" value={r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-ZA') : ''} />
                <Detail label="PayFast payment ID" value={r.pfPaymentId} breakAll />
                <Detail label="PayFast fee" value={r.feeCents ? formatZAR(r.feeCents) : ''} />
              </dl>

              <div className="mt-4 rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
                <p className="text-xs font-medium text-gold-deep">Reason</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm">{r.reason}</p>
              </div>
              {r.adminNote && (
                <p className="mt-3 break-words text-sm">
                  <span className="font-medium text-gold-deep">Note: </span>
                  {r.adminNote}
                </p>
              )}

              {r.status === 'requested' && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r, 'refund')}
                    className={`${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`}
                  >
                    {busyId === r.id ? 'Working…' : 'Mark as refunded'}
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r, 'reject')}
                    className={`${btn} border border-red-700 text-red-700 hover:bg-red-700 hover:text-white`}
                  >
                    Decline
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}