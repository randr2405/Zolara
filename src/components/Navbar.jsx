import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsAdmin from '../lib/useIsAdmin.js'
import { mainCategories } from '../lib/constants.js'
import logo from '../assets/zolara-logo.png'

const item = 'block rounded px-3 py-2 text-sm hover:bg-cream'
const trigger = 'cursor-pointer list-none text-sm text-emerald-brand hover:text-gold-deep'

function Heart() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
    </svg>
  )
}

function Glass() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const dept = useRef(null)
  const acct = useRef(null)
  const isSeller = profile?.role === 'seller'
  const firstName = (profile?.displayName || 'Account').split(' ')[0]

  const closeAll = () => {
    if (dept.current) dept.current.open = false
    if (acct.current) acct.current.open = false
  }

  function search(e) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-gold bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="shrink-0"><img src={logo} alt="Zolara" className="h-11" /></Link>

        <nav className="flex items-center gap-5">
          <Link to="/shop?type=product" className={trigger}>Shop</Link>
          <Link to="/shop?type=service" className={trigger}>Book</Link>
          <details ref={dept} className="relative">
            <summary className={trigger}>Departments</summary>
            <div onClick={closeAll}
              className="absolute left-0 mt-3 grid w-[min(90vw,34rem)] gap-x-6 rounded-lg bg-white p-4 shadow-lg ring-1 ring-gold/50 sm:grid-cols-2">
              {mainCategories('all').map((c) => (
                <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`}
                  className="border-b border-gold/20 py-2 font-display text-lg hover:text-gold-deep">{c}</Link>
              ))}
            </div>
          </details>
          {!user && <Link to="/supplier-rules" className={trigger}>Sell</Link>}
        </nav>

        <form onSubmit={search} role="search" className="order-last flex w-full items-center border-b border-gold-deep md:order-none md:ml-auto md:w-72">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Zolara"
            aria-label="Search products and services"
            className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none" />
          <button aria-label="Search" className="px-1 text-emerald-brand"><Glass /></button>
        </form>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {user && !isSeller && (
            <Link to="/favourites" aria-label="Favourites" title="Favourites" className="text-gold-deep"><Heart /></Link>
          )}
          {user ? (
            <details ref={acct} className="relative">
              <summary className={trigger}>{firstName}</summary>
              <div onClick={closeAll} className="absolute right-0 mt-3 w-52 rounded-lg bg-white p-2 shadow-lg ring-1 ring-gold/50">
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
              <Link to="/login" className={trigger}>Log in</Link>
              <Link to="/signup" className="rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}