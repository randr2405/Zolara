import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signup(form)
      navigate('/account')
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use'
        ? 'That email is already registered.'
        : err.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Create your account</h1>
      <p className="mb-6 text-sm">Shop it. Book it. Love it.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {['buyer', 'seller'].map((r) => (
            <label key={r}
              className={`cursor-pointer rounded-xl border p-3 text-center text-sm ${
                form.role === r ? 'border-emerald-brand bg-white' : 'border-gold/50'}`}>
              <input type="radio" name="role" value={r} checked={form.role === r}
                onChange={set('role')} className="sr-only" />
              {r === 'buyer' ? 'I want to shop and book' : 'I want to sell or offer a service'}
            </label>
          ))}
        </div>

        {form.role === 'seller' && (
          <p className="rounded-lg bg-white p-3 text-xs">
            Before you join as a supplier, please read our{' '}
            <a href="/supplier-rules" target="_blank" rel="noreferrer"
              className="text-emerald-brand underline">supplier rules</a>.
            You will be asked to agree to them when you set up your business profile.
          </p>
        )}

        <input required placeholder="Full name or business name" value={form.name}
          onChange={set('name')} className="rounded-lg border border-gold/50 bg-white p-3" />
        <input required type="email" placeholder="Email" value={form.email}
          onChange={set('email')} className="rounded-lg border border-gold/50 bg-white p-3" />
        <input required type="password" minLength={6} placeholder="Password (6+ characters)"
          value={form.password} onChange={set('password')}
          className="rounded-lg border border-gold/50 bg-white p-3" />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account? <Link to="/login" className="text-emerald-brand underline">Log in</Link>
      </p>
    </main>
  )
}