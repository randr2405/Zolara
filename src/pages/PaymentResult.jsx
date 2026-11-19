import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function PaymentResult({ cancelled = false }) {
  const [params] = useSearchParams()
  const type = params.get('type')
  const id = params.get('id')
  const [paid, setPaid] = useState(false)
  const col = type === 'order' ? 'orders' : 'bookings'
  const back = type === 'order' ? '/my-orders' : '/my-bookings'
  const backLabel = type === 'order' ? 'Back to my orders' : 'Back to my bookings'

  useEffect(() => {
    if (cancelled || !id) return undefined
    return onSnapshot(
      doc(db, col, id),
      (s) => setPaid(s.exists() && s.data().paymentStatus === 'paid'),
      () => {}
    )
  }, [cancelled, col, id])

  return (
    <main className="mx-auto max-w-md p-6 py-16 text-center">
      {cancelled ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">Payment cancelled</h1>
          <p className="mb-6 text-sm">No money was taken. You can try again whenever you are ready.</p>
        </>
      ) : paid ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">Payment received</h1>
          <p className="mb-6 text-sm">Thank you. The supplier can now go ahead.</p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">Confirming your payment</h1>
          <p className="mb-6 text-sm">
            This usually takes a few seconds. You can leave this page. Your payment will show as paid
            once PayFast confirms it.
          </p>
        </>
      )}
      <Link to={back} className="rounded-full bg-emerald-brand px-6 py-3 text-cream">{backLabel}</Link>
    </main>
  )
}