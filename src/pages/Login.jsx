import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout, { Field, PasswordInput, field } from '../components/AuthLayout.jsx'

const POINTS = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.'],
  ['Secure PayFast checkout', 'We never see or store your card details.'],
  ['Reviewed local suppliers', 'Every business is checked before going live.'],
]

function messageFor(err) {
  const code = err && err.code
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a few minutes, or reset your password.'
  }
  if (code === 'auth/network-request-failed') {
    return 'We could not reach Zolara. Check your internet connection and try again.'
  }
  return 'Incorrect email or password.'
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state && location.state.from && location.state.from.pathname
  const destination = from && from !== '/login' ? from : '/account'

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Log in to see your bookings, orders and favourites."
      points={POINTS}
      tags={['Local', 'Trusted', 'Calm']}
      footer={
        <p>
          New to Zolara?{' '}
          <Link
            to="/signup"
            className="inline-block rounded py-2 font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={busy}>
        <Field label="Email">
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </Field>
        <p className="-mt-2 text-right text-sm">
          <Link
            to="/forgot-password"
            className="inline-block rounded py-2 text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Forgot your password?
          </Link>
        </p>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-emerald-brand px-6 py-3 font-medium text-cream shadow-md transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-60"
        >
          {busy && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}