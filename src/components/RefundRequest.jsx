import { useState } from 'react'
import { formatZAR } from '../lib/constants.js'
import { REFUND_ELIGIBLE, refundErrorMessage, requestRefund } from '../lib/refunds.js'

const wrap = 'mt-3 border-t border-gold/40 pt-3 text-sm'

export default function RefundRequest({ kind, item }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (item.refundStatus === 'requested') {
    return <p className={wrap}>Refund requested. The Zolara team is reviewing it and will email you.</p>
  }

  if (item.paymentStatus === 'refunded') {
    return (
      <p className={wrap}>
        Refunded {formatZAR(item.refundedCents ?? item.paidCents)}. Depending on how you paid, it can
        take several business days to reach you.
      </p>
    )
  }

  if (item.paymentStatus !== 'paid' || !REFUND_ELIGIBLE[kind].includes(item.status)) return null

  async function submit(e) {
    e.preventDefault()
    if (!reason.trim()) return setError('Please tell us why you are asking for a refund.')
    setBusy(true)
    setError('')
    try {
      await requestRefund(kind, item.id, reason.trim())
      setOpen(false)
      setReason('')
    } catch (err) {
      console.error(err)
      setError(refundErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={wrap}>
      {item.refundStatus === 'rejected' && (
        <p className="mb-2 text-red-700">
          Your last refund request was declined.{item.refundNote ? ` Note: ${item.refundNote}` : ''}
        </p>
      )}
      {!open ? (
        <>
          <p className="mb-2 text-xs">
            A paid {kind} cannot be cancelled. If something went wrong, you can ask Zolara for a refund.
          </p>
          <button type="button" onClick={() => setOpen(true)}
            className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep">
            Request a refund
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <textarea required rows={3} maxLength={1000} value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us what went wrong"
            className="rounded-lg border border-gold/50 bg-white p-3 text-sm" />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button disabled={busy}
              className="rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream disabled:opacity-60">
              {busy ? 'Sending…' : 'Send refund request'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-full border border-gold-deep px-5 py-2 text-sm text-gold-deep">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}