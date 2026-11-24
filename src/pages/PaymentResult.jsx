import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

const btn =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnQuiet = `${btn} border border-gold-deep text-gold-deep hover:bg-cream`

const SLOW_AFTER_MS = 20000

function Spinner() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin motion-reduce:animate-none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}

function Check() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function Cross() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12 M18 6L6 18" />
    </svg>
  )
}

export default function PaymentResult({ cancelled = false }) {
  const [params] = useSearchParams()
  const type = params.get('type')
  const id = params.get('id')
  const [paid, setPaid] = useState(false)
  const [slow, setSlow] = useState(false)
  const col = type === 'order' ? 'orders' : 'bookings'
  const back = type === 'order' ? '/my-orders' : '/my-bookings'
  const backLabel = type === 'order' ? 'Back to my orders' : 'Back to my bookings'
  const noun = type === 'order' ? 'order' : 'booking'

  useEffect(() => {
    if (cancelled || !id) return undefined
    return onSnapshot(
      doc(db, col, id),
      (s) => setPaid(s.exists() && s.data().paymentStatus === 'paid'),
      () => {}
    )
  }, [cancelled, col, id])

  useEffect(() => {
    if (cancelled || paid || !id) return undefined
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(t)
  }, [cancelled, paid, id])

  let state = 'pending'
  if (cancelled) state = 'cancelled'
  else if (!id) state = 'unknown'
  else if (paid) state = 'paid'

  const view = {
    cancelled: {
      icon: <Cross />,
      iconClass: 'bg-red-100 text-red-800',
      title: 'Payment cancelled',
      body: 'No money was taken. You can try again whenever you are ready.',
      extra: `Open your ${noun} and tap Pay now to try again.`,
    },
    paid: {
      icon: <Check />,
      iconClass: 'bg-emerald-brand text-gold',
      title: 'Payment received',
      body: 'Thank you. The supplier can now go ahead.',
      extra: null,
    },
    pending: {
      icon: <Spinner />,
      iconClass: 'bg-cream text-gold-deep ring-1 ring-gold/60',
      title: 'Confirming your payment',
      body: 'This usually takes a few seconds. You can leave this page. Your payment will show as paid once PayFast confirms it.',
      extra: slow
        ? `This is taking longer than usual. Your ${noun} will update by itself, so you do not need to pay again.`
        : null,
    },
    unknown: {
      icon: <Cross />,
      iconClass: 'bg-cream text-gold-deep ring-1 ring-gold/60',
      title: 'We could not find this payment',
      body: `Open your ${noun}s to check whether it shows as paid.`,
      extra: null,
    },
  }[state]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-cream px-5 py-10 sm:items-center sm:px-8 sm:py-16">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/40 bg-white text-center shadow-sm">
        <div className="h-1.5 bg-gold" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${view.iconClass}`}>
            {view.icon}
          </div>

          <div role="status" aria-live="polite">
            <h1 className="mt-5 font-display text-2xl font-semibold text-emerald-brand sm:text-3xl">{view.title}</h1>
            <p className="mt-3 text-sm text-charcoal/80">{view.body}</p>
            {view.extra && (
              <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">{view.extra}</p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link to={back} className={btnPrimary}>
              {backLabel}
            </Link>
            {state !== 'pending' && (
              <Link to="/shop" className={btnQuiet}>
                Keep shopping
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}