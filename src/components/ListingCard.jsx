import { Link } from 'react-router-dom'
import FavouriteButton from './FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'

export default function ListingCard({ listing: l, className = '' }) {
  const service = l.type === 'service'
  const soldOut = !service && (!l.stock || l.stock < 1)
  const low = !service && l.stock > 0 && l.stock <= 3
  const note = soldOut ? 'Out of stock' : low ? `Only ${l.stock} left` : service && l.durationMinutes ? `${l.durationMinutes} min` : ''

  return (
    <div className={`relative ${className}`}>
      <FavouriteButton listingId={l.id} className="absolute right-3 top-7 z-10" />
      <Link to={`/listing/${l.id}`} className="block overflow-hidden rounded-t-[3rem] rounded-b-md bg-white ring-1 ring-gold/40">
        {l.thumb
          ? <img src={l.thumb} alt={l.title} loading="lazy" className={`aspect-[4/5] w-full object-cover ${soldOut ? 'opacity-60' : ''}`} />
          : <div className="aspect-[4/5] w-full bg-cream" />}
      </Link>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <Link to={`/listing/${l.id}`} className="truncate font-medium">{l.title}</Link>
        <p className="shrink-0 font-display text-xl font-semibold text-emerald-brand">{formatZAR(l.priceCents)}</p>
      </div>
      <p className="truncate text-xs">
        <Link to={`/supplier/${l.sellerId}`} className="underline">{l.sellerName}</Link>
        {l.city ? `, ${l.city}` : ''}
      </p>
      {(note || l.sellerPreferred) && (
        <p className={`mt-1 text-xs ${soldOut || low ? 'font-medium text-red-700' : 'text-gold-deep'}`}>
          {l.sellerPreferred ? PREFERRED_LABEL : note}
          {l.sellerPreferred && note ? `, ${note.toLowerCase()}` : ''}
        </p>
      )}
    </div>
  )
}