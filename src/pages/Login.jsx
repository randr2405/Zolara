import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout, { Field, PasswordInput, field } from '../components/AuthLayout.jsx'

const POINTS = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.'],
  ['Secure PayFast checkout', 'We never see or store your card details.'],
  ['Reviewed local suppliers', 'Every business is checked before going live.'],
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/account')
    } catch {
      setError('Incorrect email or password.')
    } finally {
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
          <Link to="/signup" className="font-medium text-emerald-brand underline">Create an account</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <input required type="email" autoComplete="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} className={field} />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password" autoComplete="current-password" />
        </Field>
        <p className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="text-emerald-brand underline">Forgot your password?</Link>
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 font-medium text-cream shadow-md transition hover:-translate-y-0.5 disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}