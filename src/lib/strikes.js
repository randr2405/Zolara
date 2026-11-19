export const STRIKE_LIMIT = 3
export const STRIKE_WINDOW_DAYS = 90
export const BAN_MONTHS = 6

export function strikeLabel(n) {
  if (n >= STRIKE_LIMIT) return 'Removal from Zolara'
  if (n === STRIKE_LIMIT - 1) return 'Final warning'
  if (n >= 1) return 'Written warning'
  return ''
}