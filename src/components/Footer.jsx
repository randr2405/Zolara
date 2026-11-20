import { Link } from 'react-router-dom'

const col = 'flex flex-col gap-2 text-sm'
const head = 'mb-1 font-display text-xl font-semibold text-emerald-brand'

export default function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-gold bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl font-semibold leading-tight text-emerald-brand">
            Shop it. Book it. Love it.
          </p>
          <p className="mt-3 max-w-xs text-sm">A calm, trusted place to buy and book from local South Africans.</p>
        </div>
        <nav className={col}>
          <p className={head}>Shop</p>
          <Link to="/shop?type=product">Products</Link>
          <Link to="/shop?type=service">Services</Link>
          <Link to="/shop">Everything</Link>
        </nav>
        <nav className={col}>
          <p className={head}>Sell</p>
          <Link to="/signup">Sell on Zolara</Link>
          <Link to="/supplier-rules">Supplier rules</Link>
        </nav>
        <nav className={col}>
          <p className={head}>Legal</p>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
      <p className="border-t border-gold/40 px-4 py-4 text-center text-xs">
        Zolara is owned by R&R Agencies. R&R Site Solutions is a division of R&R Agencies.
      </p>
    </footer>
  )
}