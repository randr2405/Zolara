import { useAuth } from '../context/AuthContext.jsx'

export default function Account() {
  const { profile, user } = useAuth()
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">
        Hello, {profile?.displayName || user?.displayName}
      </h1>
      <p className="mb-4 text-sm">
        Signed in as {user?.email} ({profile?.role || 'setting up…'})
      </p>
      <p>
        {profile?.role === 'seller'
          ? 'Your seller dashboard is coming next: profile, listings and orders.'
          : 'Your orders and bookings will show here.'}
      </p>
    </main>
  )
}