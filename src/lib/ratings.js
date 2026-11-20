export const MIN_REVIEWS = 5

export function summarize(reviews) {
  const total = reviews.length
  const happy = reviews.filter((r) => r.satisfied).length
  const score = total >= MIN_REVIEWS ? Math.round((happy / total) * 100) : null
  return { total, happy, score }
}