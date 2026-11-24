import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AuthLayout, { Field, PasswordInput, field } from '../components/AuthLayout.jsx'

const POINTS = [
  ['Pay after they accept', 'Nothing is charged until the supplier confirms.'],
  ['Secure PayFast checkout', 'We never see or store your card details.'],
  ['Reviewed local suppliers', 'Every business is checked before going live.'],
]

const ROLES = [
  { value: 'buyer', title: 'I want to shop and book', icon: 'bag' },
  { value: 'seller', title: 'I want to sell or offer a service', icon: 'store' },
]

const ICONS = {
  bag: 'M5 8h14l-1 12H6z M9 8V6a3 3 0 016 0v2',
  store: 'M4 9l1.5-5h13L20 9 M4 9h16v11H4z M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 004 0 M10 20v-5h4v5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
}

function Icon({ name, size = 20 }) {
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

function messageFor(err) {
  const code = err && err.code
  if (code === 'auth/email-already-in-use') return 'That email is already registered. Try logging in instead.'
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.'
  if (code === 'auth/network-request-failed') {
    return 'We could not reach Zolara. Check your internet connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (!agreed) return setError('Please confirm that you are 18 or older and agree to the Terms and Privacy Policy.')
    setBusy(true)
    try {
      await signup({ ...form, name: form.name.trim(), email: form.email.trim() })
      navigate('/account', { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Shop it. Book it. Love it."
      points={POINTS}
      tags={['Local', 'Trusted', 'Calm']}
      footer={
        <p>
          Already have an account?{' '}
          <Link
            to="/login"
            className="inline-block rounded py-2 font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={busy}>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-emerald-brand">What brings you to Zolara?</legend>
          <div className="grid gap-3 min-[480px]:grid-cols-2">
            {ROLES.map((r) => {
              const selected = form.role === r.value
              return (
                <label
                  key={r.value}
                  className={`relative flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition focus-within:ring-2 focus-within:ring-gold ${
                    selected
                      ? 'border-emerald-brand bg-white shadow-sm ring-1 ring-emerald-brand'
                      : 'border-gold/50 bg-white/60 hover:border-gold-deep'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={selected}
                    onChange={set('role')}
                    className="sr-only"
                  />
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-lg ${
                      selected ? 'bg-emerald-brand text-gold' : 'bg-cream text-emerald-brand'
                    }`}
                  >
                    <Icon name={r.icon} />
                  </span>
                  <span className="flex-1 font-medium leading-snug text-emerald-brand">{r.title}</span>
                  {selected && (
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-emerald-brand text-gold">
                      <Icon name="check" size={13} />
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>

        {form.role === 'seller' && (
          <p className="rounded-xl border border-gold/50 bg-white p-3 text-sm leading-relaxed">
            Before you join as a supplier, please read our{' '}
            <a
              href="/supplier-rules"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-brand underline"
            >
              supplier rules
            </a>
            . You will be asked to agree to them when you set up your business profile.
          </p>
        )}

        <Field label="Full name or business name">
          <input
            required
            autoComplete="name"
            placeholder="Full name or business name"
            value={form.name}
            onChange={set('name')}
            className={field}
          />
        </Field>

        <Field label="Email">
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            className={field}
          />
        </Field>

        <div>
          <Field label="Password">
            <PasswordInput
              value={form.password}
              onChange={set('password')}
              placeholder="Password (6+ characters)"
              autoComplete="new-password"
            />
          </Field>
          <p className="mt-1.5 text-xs text-charcoal/70">Use at least 6 characters.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl py-1 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 flex-none cursor-pointer accent-emerald-brand"
          />
          <span>
            I am 18 or older and I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-brand underline"
            >
              Terms of Use
            </a>{' '}
            and the{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-brand underline"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

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
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}