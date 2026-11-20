import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsAdmin from '../lib/useIsAdmin.js'
import { mainCategories } from '../lib/constants.js'
import logo from '../assets/zolara-logo.png'

const item = 'block rounded px-3 py-2 text-sm hover:bg-cream'

function Heart() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
    </svg>
  )
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const menu = useRef(null)
  const isSeller = profile?.role === 'seller'
  const firstName = (profile?.displayName || 'Account').split(' ')[0]

  const close = () => {
    if (menu.current) menu.current.open = false
  }

  function search(e) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="bg-emerald-brand px-4 py-1.5 text-xs text-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-gold">Support local businesses, don’t kill them.</p>
          {!user && <Link to="/supplier-rules" className="text-cream underline">Sell on Zolara</Link>}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="shrink-0"><img src={logo} alt="Zolara" className="h-10" /></Link>

        <form onSubmit={search} className="order-3 flex w-full flex-1 md:order-none md:w-auto" role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products and services"
            aria-label="Search products and services"
            className="min-w-0 flex-1 rounded-l-full border border-gold/60 bg-cream px-4 py-2 text-sm outline-none focus:border-emerald-brand" />
          <button className="rounded-r-full bg-emerald-brand px-5 text-sm font-medium text-cream">Search</button>
        </form>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {user && !isSeller && (
            <Link to="/favourites" aria-label="Favourites" title="Favourites" className="text-gold-deep"><Heart /></Link>
          )}
          {user ? (
            <details ref={menu} className="relative">
              <summary className="cursor-pointer list-none rounded-full border border-gold-deep px-4 py-2 text-sm text-emerald-brand">
                Hi, {firstName}
              </summary>
              <div onClick={close} className="absolute right-0 mt-2 w-52 rounded-lg bg-white p-2 shadow-lg ring-1 ring-gold/40">
                {isAdmin && (
                  <>
                    <Link to="/admin" className={`${item} font-medium text-gold-deep`}>Admin</Link>
                    <Link to="/admin/refunds" className={`${item} font-medium text-gold-deep`}>Refunds</Link>
                  </>
                )}
                {isSeller ? (
                  <>
                    <Link to="/seller" className={item}>Dashboard</Link>
                    <Link to="/seller/bookings" className={item}>Bookings</Link>
                    <Link to="/seller/orders" className={item}>Orders</Link>
                    <Link to="/seller/payments" className={item}>Payments</Link>
                  </>
                ) : (
                  <>
                    <Link to="/my-bookings" className={item}>My bookings</Link>
                    <Link to="/my-orders" className={item}>My orders</Link>
                    <Link to="/favourites" className={item}>Favourites</Link>
                  </>
                )}
                <Link to="/account" className={item}>Account</Link>
                <button onClick={logout} className={`${item} w-full text-left text-gold-deep`}>Log out</button>
              </div>
            </details>
          ) : (
            <>
              <Link to="/login" className="text-sm text-emerald-brand">Log in</Link>
              <Link to="/signup" className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Sign up</Link>
            </>
          )}
        </div>
      </div>

      <nav className="border-t border-gold/30 bg-cream">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto whitespace-nowrap px-4 py-2 text-sm">
          <Link to="/shop?type=product" className="font-medium text-emerald-brand">Products</Link>
          <Link to="/shop?type=service" className="font-medium text-emerald-brand">Services</Link>
          {mainCategories('all').map((c) => (
            <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} className="text-charcoal hover:text-emerald-brand">{c}</Link>
          ))}
        </div>
      </nav>
    </header>
  )
}