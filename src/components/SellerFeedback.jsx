import { useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { strikeLabel } from '../lib/strikes.js'

export default function SellerFeedback({ docId, data }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'feedback', docId), {
        sellerResponse: text.trim(),
        sellerRespondedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Could not send your response. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const note = data.reviewNote ? ` Note: ${data.reviewNote}` : ''

  return (
    <div className="mt-3 border-t border-gold/40 pt-3 text-sm">
      <p>
        Customer feedback: {data.satisfied ? 'Satisfied' : 'Not satisfied'}
        {data.comment ? ` — ${data.comment}` : ''}
      </p>

      {!data.satisfied && (
        <>
          {data.sellerResponse && (
            <p className="mt-2 whitespace-pre-line">Your response: {data.sellerResponse}</p>
          )}

          {data.reviewStatus === 'valid' && (
            <p className="mt-2 text-red-700">
              Zolara upheld this complaint.
              {data.strikeNumber ? ` ${strikeLabel(data.strikeNumber)}.` : ''}
              {note}
            </p>
          )}
          {data.reviewStatus === 'dismissed' && (
            <p className="mt-2">Zolara reviewed this complaint and dismissed it.{note}</p>
          )}

          {!data.reviewStatus && data.sellerResponse && (
            <p className="mt-2 text-xs">Zolara will review the complaint and your response.</p>
          )}

          {!data.reviewStatus && !data.sellerResponse && (
            <form onSubmit={send} className="mt-3 flex flex-col gap-2">
              <p className="text-xs">
                You can respond before Zolara decides. Please be factual and polite.
              </p>
              <textarea required rows={3} maxLength={1500} value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Your side of what happened"
                className="rounded-lg border border-gold/50 bg-white p-3 text-sm" />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button disabled={busy}
                className="self-start rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream disabled:opacity-60">
                {busy ? 'Sending…' : 'Send response'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}