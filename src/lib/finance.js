export const SUBSCRIPTION_CENTS = 25000

const ANCHOR = new Date(2026, 10, 16)
const DAY = 24 * 60 * 60 * 1000

export function fortnightFor(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const index = Math.floor(Math.round((today - ANCHOR) / DAY) / 14)
  const start = new Date(ANCHOR)
  start.setDate(start.getDate() + index * 14)
  const end = new Date(start)
  end.setDate(end.getDate() + 13)
  return { start, end }
}

export function toInputDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const startOfDay = (s) => new Date(`${s}T00:00:00`).getTime()
export const endOfDay = (s) => new Date(`${s}T23:59:59.999`).getTime()

export const millis = (ts) => ts?.toMillis?.() || 0

export const formatDate = (ts) =>
  ts?.toDate ? ts.toDate().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0)

export const LEDGER_LABEL = {
  subscription: 'Monthly subscription',
  payout: 'Payout',
  adjustment: 'Adjustment',
}