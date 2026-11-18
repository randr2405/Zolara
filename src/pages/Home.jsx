import { Link } from 'react-router-dom'
import logo from '../assets/zolara-logo.png'

export default function Home() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <img src={logo} alt="Zolara" className="w-full max-w-md" />
      <p className="text-lg text-emerald-brand">
        A calm, trusted place to buy and book from local South Africans.
      </p>
      <div className="flex gap-3">
        <button className="rounded-full bg-emerald-brand px-6 py-3 text-cream">
          Join the waitlist
        </button>
        <Link to="/supplier-rules"
          className="rounded-full border border-gold-deep px-6 py-3 text-gold-deep">
          List your business
        </Link>
      </div>
    </main>
  )
}