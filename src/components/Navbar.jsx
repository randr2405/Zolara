import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsAdmin from '../lib/useIsAdmin.js'
import { CATALOG, mainCategories } from '../lib/constants.js'
import logo from '../assets/zolara-logo.png'

const item = 'block rounded px-3 py-2 text-sm hover:bg-cream'
const navLink = 'whitespace-nowrap text-sm font-medium text-emerald-brand hover:text-gold-deep'

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
  const [cat, setCat] = useState('')
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
    const p = new URLSearchParams()
    if (cat) p.set('category', cat)
    if (q.trim()) p.set('q', q.trim())
    const s = p.toString()
    navigate(s ? `/shop?${s}` : '/shop')
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="bg-emerald-brand px-4 py-1.5 text-xs text-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-gold">Support local businesses, don’t kill them.</p>
          <div className="flex gap-4">
            <Link to="/supplier-rules" className="hover:text-gold">Supplier rules</Link>
            {!user && <Link to="/signup" className="hover:text-gold">Sell on Zolara</Link>}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link to="/" className="shrink-0"><img src={logo} alt="Zolara" className="h-11" /></Link>

        <form onSubmit={search} role="search"
          className="order-last flex w-full overflow-hidden rounded-full border-2 border-emerald-brand bg-white md:order-none md:w-auto md:flex-1">
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Department"
            className="hidden max-w-44 border-r border-gold/60 bg-cream px-3 text-sm outline-none sm:block">
            <option value="">All departments</option>
            {mainCategories('all').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products and services"
            aria-label="Search products and services" className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none" />
          <button aria-label="Search" className="bg-emerald-brand px-5 text-cream"><Glass /></button>
        </form>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {user && !isSeller && (
            <Link to="/favourites" aria-label="Favourites" title="Favourites" className="text-gold-deep"><Heart /></Link>
          )}
          {user ? (
            <details ref={acct} className="relative">
              <summary className={`cursor-pointer list-none ${navLink}`}>Hi, {firstName}</summary>
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
              <Link to="/login" className={navLink}>Log in</Link>
              <Link to="/signup" className="rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream">Sign up</Link>
            </>
          )}
        </div>
      </div>

      <nav className="border-t border-gold/40 bg-cream">
        <div className="relative mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 md:overflow-visible">
          <details ref={dept}>
            <summary className="flex cursor-pointer list-none items-center gap-2 whitespace-nowrap rounded-full bg-emerald-brand px-4 py-1.5 text-sm font-medium text-cream">
              <span aria-hidden="true">☰</span> All departments
            </summary>
            <div onClick={closeAll}
              className="absolute inset-x-4 top-full z-50 mt-1 grid max-h-[70vh] gap-6 overflow-y-auto rounded-b-xl bg-white p-6 shadow-xl ring-1 ring-gold/50 sm:grid-cols-2 lg:grid-cols-4">
              {CATALOG.map((c) => (
                <div key={c.name}>
                  <Link to={`/shop?category=${encodeURIComponent(c.name)}`}
                    className="font-display text-xl font-semibold text-emerald-brand hover:text-gold-deep">{c.name}</Link>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {c.subs.slice(0, 6).map((s) => (
                      <li key={s.name}>
                        <Link to={`/shop?category=${encodeURIComponent(c.name)}&subcategory=${encodeURIComponent(s.name)}`}
                          className="text-sm hover:text-emerald-brand hover:underline">{s.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
          <Link to="/shop?type=product" className={navLink}>Products</Link>
          <Link to="/shop?type=service" className={navLink}>Services</Link>
          <Link to="/shop" className={navLink}>Everything</Link>
          {!user && <Link to="/supplier-rules" className={`${navLink} text-gold-deep`}>Sell on Zolara</Link>}
        </div>
      </nav>
    </header>
  )
}