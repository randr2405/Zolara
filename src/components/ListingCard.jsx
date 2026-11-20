import { Link } from 'react-router-dom'
import FavouriteButton from './FavouriteButton.jsx'
import { formatZAR, PREFERRED_LABEL } from '../lib/constants.js'

export default function ListingCard({ listing: l, className = '' }) {
  const service = l.type === 'service'
  const soldOut = !service && (!l.stock || l.stock < 1)
  const low = !service && l.stock > 0 && l.stock <= 3
  const note = soldOut ? 'Out of stock' : low ? `Only ${l.stock} left` : service && l.durationMinutes ? `${l.durationMinutes} min` : ''

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gold/30 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-gold-deep ${className}`}>
      <FavouriteButton listingId={l.id} className="absolute right-2 top-2 z-10" />
      <Link to={`/listing/${l.id}`} className="relative block overflow-hidden">
        {l.thumb
          ? <img src={l.thumb} alt={l.title} loading="lazy" className={`aspect-square w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? 'opacity-60' : ''}`} />
          : <div className="aspect-square w-full bg-cream" />}
        <span className="absolute left-0 top-3 bg-emerald-brand py-0.5 pl-2 pr-4 text-xs text-cream [clip-path:polygon(0_0,100%_0,calc(100%_-_10px)_100%,0_100%)]">
          {service ? 'Service' : 'Product'}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to={`/listing/${l.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug">{l.title}</Link>
        <p className="truncate text-xs">
          <Link to={`/supplier/${l.sellerId}`} className="underline">{l.sellerName}</Link>
          {l.city ? `, ${l.city}` : ''}
        </p>
        {(note || l.sellerPreferred) && (
          <p className={`text-xs ${soldOut || low ? 'font-medium text-red-700' : 'text-gold-deep'}`}>
            {l.sellerPreferred ? PREFERRED_LABEL : note}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="relative bg-gold py-1 pl-5 pr-3 text-sm font-bold text-emerald-brand [clip-path:polygon(0_50%,10px_0,100%_0,100%_100%,10px_100%)]">
            <i className="absolute left-[7px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
            {formatZAR(l.priceCents)}
          </span>
          <Link to={`/listing/${l.id}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${soldOut ? 'bg-cream text-charcoal' : 'bg-action text-white'}`}>
            {soldOut ? 'View' : service ? 'Book' : 'Buy'}
          </Link>
        </div>
      </div>
    </div>
  )
}