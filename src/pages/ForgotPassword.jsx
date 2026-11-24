import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'

const btn =
  'inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnQuiet = `${btn} border border-gold-deep text-gold-deep hover:bg-cream`

const ICONS = {
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
}

function Icon({ name, size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setSent(true)
      }
    } finally {
      setBusy(false)
    }
  }

  function tryAgain() {
    setSent(false)
    setError('')
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-cream px-5 py-10 sm:items-center sm:px-8 sm:py-16">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-sm">
        <div className="h-1.5 bg-gold" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          {sent ? (
            <div role="status" aria-live="polite" className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-brand text-gold">
                <Icon name="mail" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-semibold text-emerald-brand">Check your email</h1>
              <p className="mt-3 break-words text-sm text-charcoal/80">
                If an account exists for <span className="font-medium text-charcoal">{email.trim()}</span>, we have
                sent a link to reset your password.
              </p>
              <p className="mt-2 text-sm text-charcoal/70">
                It can take a few minutes. Check your spam folder too.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link to="/login" className={btnPrimary}>
                  Back to log in
                </Link>
                <button type="button" onClick={tryAgain} className={btnQuiet}>
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid h-14 w-14 place-items-center rounded-full bg-cream text-gold-deep">
                <Icon name="lock" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-semibold text-emerald-brand sm:text-3xl">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-charcoal/80">
                Enter your email and we will send you a link to choose a new password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate={false}>
                <div>
                  <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-emerald-brand">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'reset-error' : undefined}
                    className={`min-h-[48px] w-full rounded-xl border bg-white px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      error ? 'border-red-700' : 'border-gold/50'}`}
                  />
                </div>

                {error && (
                  <p
                    id="reset-error"
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}

                <button disabled={busy} className={btnPrimary}>
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm">
                <Link
                  to="/login"
                  className="inline-flex min-h-[44px] items-center font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}