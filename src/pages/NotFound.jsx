import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-6 py-16 text-center">
      <p className="mb-2 text-5xl font-semibold text-gold-deep">404</p>
      <h1 className="mb-2 text-2xl font-semibold text-emerald-brand">Page not found</h1>
      <p className="mb-6 text-sm">
        The page you are looking for does not exist or may have moved.
      </p>
      <div className="flex justify-center gap-3">
        <Link to="/shop" className="rounded-full bg-emerald-brand px-6 py-3 text-cream">
          Browse the shop
        </Link>
        <Link to="/" className="rounded-full border border-gold-deep px-6 py-3 text-gold-deep">
          Go home
        </Link>
      </div>
    </main>
  )
}