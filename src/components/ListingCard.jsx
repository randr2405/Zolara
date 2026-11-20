import { Link } from 'react-router-dom'
import FavouriteButton from './FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'

export default function ListingCard({ listing: l, className = '' }) {
  const service = l.type === 'service'
  const soldOut = !service && (!l.stock || l.stock < 1)
  const low = !service && l.stock > 0 && l.stock <= 3

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-lg bg-white ring-1 ring-gold/25 transition hover:ring-gold-deep ${className}`}>
      <FavouriteButton listingId={l.id} className="absolute right-2 top-2 z-10" />
      <Link to={`/listing/${l.id}`} className="relative block">
        {l.thumb
          ? <img src={l.thumb} alt={l.title} loading="lazy" className="aspect-square w-full object-cover" />
          : <div className="aspect-square w-full bg-cream" />}
        <span className="absolute left-2 top-2 rounded bg-emerald-brand px-2 py-0.5 text-xs font-medium text-cream">
          {service ? 'Service' : 'Product'}
        </span>
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-1 text-center text-xs text-cream">Out of stock</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {l.sellerPreferred && (
          <p className="w-fit rounded-full bg-cream px-2 py-0.5 text-xs text-gold-deep">{PREFERRED_LABEL}</p>
        )}
        <Link to={`/listing/${l.id}`} className="line-clamp-2 text-sm font-medium leading-snug">{l.title}</Link>
        <p className="text-lg font-semibold text-emerald-brand">{formatZAR(l.priceCents)}</p>
        {low && <p className="text-xs font-medium text-red-700">Only {l.stock} left</p>}
        {service && l.durationMinutes && <p className="text-xs text-gold-deep">{l.durationMinutes} min</p>}
        <p className="mt-auto truncate text-xs">
          <Link to={`/supplier/${l.sellerId}`} className="underline">{l.sellerName}</Link>
          {l.city ? `, ${l.city}` : ''}
        </p>
        <Link to={`/listing/${l.id}`}
          className="mt-2 rounded-full bg-action py-2 text-center text-sm font-medium text-white">
          {service ? 'Book now' : 'View and buy'}
        </Link>
      </div>
    </div>
  )
}