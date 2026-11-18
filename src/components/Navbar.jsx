import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import logo from '../assets/zolara-logo.png'

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  return (
    <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
      <Link to="/"><img src={logo} alt="Zolara" className="h-10" /></Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link to="/shop" className="text-emerald-brand">Shop</Link>
        {user ? (
          <>
            {profile?.role === 'seller' && (
              <Link to="/seller" className="text-emerald-brand">Dashboard</Link>
            )}
            <Link to="/account" className="text-emerald-brand">
              {profile?.displayName || 'Account'}
            </Link>
            <button onClick={logout} className="text-gold-deep">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-emerald-brand">Log in</Link>
            <Link to="/signup" className="rounded-full bg-emerald-brand px-4 py-2 text-cream">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}