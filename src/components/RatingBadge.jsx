export default function RatingBadge({ rating, subject = '', large = false }) {
  const { total, score } = rating

  if (large) {
    return (
      <div className="rounded-xl bg-white px-5 py-3 text-center">
        {score !== null ? (
          <>
            <p className="text-2xl font-semibold text-emerald-brand">{score}% satisfied</p>
            <p className="text-xs text-gold-deep">{total} customer reviews</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-emerald-brand">New supplier</p>
            <p className="text-xs text-gold-deep">
              {total > 0 ? `${total} ${total === 1 ? 'review' : 'reviews'} so far` : 'No reviews yet'}
            </p>
          </>
        )}
      </div>
    )
  }

  const text =
    score !== null
      ? `${score}% satisfied (${total} reviews)`
      : total > 0
        ? `New, ${total} ${total === 1 ? 'review' : 'reviews'} so far`
        : 'No reviews yet'

  return (
    <p>
      <span className="text-gold-deep">{subject}:</span>{' '}
      <span className={score !== null ? 'font-medium text-emerald-brand' : ''}>{text}</span>
    </p>
  )
}