import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'

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

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">Reset your password</h1>

      {sent ? (
        <>
          <p className="mb-4 text-sm">
            If an account exists for {email}, we have sent a link to reset your password. Check your
            inbox and your spam folder.
          </p>
          <Link to="/login" className="text-sm text-emerald-brand underline">Back to log in</Link>
        </>
      ) : (
        <>
          <p className="mb-6 text-sm">Enter your email and we will send you a link to choose a new password.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input required type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gold/50 bg-white p-3" />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button disabled={busy}
              className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-4 text-sm">
            <Link to="/login" className="text-emerald-brand underline">Back to log in</Link>
          </p>
        </>
      )}
    </main>
  )
}