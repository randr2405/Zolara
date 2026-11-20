import { Link } from 'react-router-dom'
import logo from '../assets/zolara-logo.png'

const col = 'flex flex-col gap-2 text-sm'

export default function Footer() {
  return (
    <footer className="mt-12 bg-emerald-brand text-cream">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo} alt="Zolara" className="h-10 rounded bg-white p-1" />
          <p className="mt-3 text-sm text-gold">Shop it. Book it. Love it.</p>
          <p className="mt-2 max-w-xs text-sm text-cream/80">
            A calm, trusted place to buy and book from local South Africans.
          </p>
        </div>
        <nav className={col}>
          <p className="font-serif text-lg text-gold">Shop</p>
          <Link to="/shop?type=product">Products</Link>
          <Link to="/shop?type=service">Services</Link>
          <Link to="/shop">Everything</Link>
        </nav>
        <nav className={col}>
          <p className="font-serif text-lg text-gold">Sell</p>
          <Link to="/signup">Sell on Zolara</Link>
          <Link to="/supplier-rules">Supplier rules</Link>
        </nav>
        <nav className={col}>
          <p className="font-serif text-lg text-gold">Legal</p>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
      <div className="border-t border-gold/30 px-4 py-4 text-center text-xs text-cream/80">
        Zolara is owned by R&R Agencies. R&R Site Solutions is a division of R&R Agencies.
      </div>
    </footer>
  )
}