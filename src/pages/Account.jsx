import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Account() {
  const { user, profile } = useAuth()
  const isSeller = profile?.role === 'seller'
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">
        {profile?.displayName || 'Your account'}
      </h1>
      <p className="mb-1 text-sm">{user?.email}</p>
      <p className="mb-6 text-sm text-gold-deep">
        {isSeller ? 'Seller account' : 'Buyer account'}
      </p>
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
        {isSeller ? (
          <>
            <Link to="/seller" className="text-emerald-brand underline">Go to your seller dashboard</Link>
            <Link to="/seller/bookings" className="text-emerald-brand underline">Manage your bookings</Link>
          </>
        ) : (
          <>
            <Link to="/my-bookings" className="text-emerald-brand underline">View your bookings</Link>
            <Link to="/shop" className="text-emerald-brand underline">Browse the shop</Link>
          </>
        )}
      </div>
    </main>
  )
}