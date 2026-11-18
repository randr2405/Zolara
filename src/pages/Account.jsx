import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Account() {
  const { user, profile } = useAuth()
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">
        {profile?.displayName || 'Your account'}
      </h1>
      <p className="mb-1 text-sm">{user?.email}</p>
      <p className="mb-6 text-sm text-gold-deep">
        {profile?.role === 'seller' ? 'Seller account' : 'Buyer account'}
      </p>
      <div className="rounded-xl bg-white p-4">
        {profile?.role === 'seller'
          ? <Link to="/seller" className="text-emerald-brand underline">Go to your seller dashboard</Link>
          : 'Your orders and bookings will show here.'}
      </div>
    </main>
  )
}