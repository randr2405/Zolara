import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gold/50 bg-white px-6 py-6 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs">
          Zolara is owned by R&R Agencies. Shop it. Book it. Love it.
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link to="/shop" className="text-emerald-brand">Shop</Link>
          <Link to="/supplier-rules" className="text-emerald-brand">Supplier rules</Link>
          <Link to="/terms" className="text-emerald-brand">Terms</Link>
          <Link to="/privacy" className="text-emerald-brand">Privacy</Link>
          <Link to="/signup" className="text-emerald-brand">Sell on Zolara</Link>
        </nav>
      </div>
    </footer>
  )
}