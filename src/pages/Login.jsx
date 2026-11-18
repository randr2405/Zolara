import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

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
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-semibold text-emerald-brand">Welcome back</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input required type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gold/50 bg-white p-3" />
        <input required type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gold/50 bg-white p-3" />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        New to Zolara? <Link to="/signup" className="text-emerald-brand underline">Create an account</Link>
      </p>
    </main>
  )
}