import { formatZAR } from './constants.js'

export const DELIVERY_OPTIONS = [
  ['collection', 'Collection only', 'The customer collects from you, so there is no delivery cost.'],
  ['flat', 'Flat delivery fee', 'You set a fixed fee. The customer sees it before they pay.'],
  ['free', 'Free delivery', 'You cover delivery, for example on orders above a minimum value.'],
]

export function deliverySummary(listing) {
  const type = listing?.deliveryType
  if (type === 'collection') return 'Collection only'
  if (type === 'free') return 'Free delivery'
  if (type === 'flat') return `Delivery ${formatZAR(listing.deliveryFeeCents)}`
  return 'Delivery cost confirmed by the supplier'
}

export const deliveryOf = (order) => (Number.isInteger(order?.deliveryCents) ? order.deliveryCents : 0)

export const orderTotal = (order) => (Number.isInteger(order?.grandTotalCents) ? order.grandTotalCents : order?.totalCents || 0)

export const hasDeliveryCost = (order) => Number.isInteger(order?.deliveryCents)

export const deliveryIsEditable = (order) => order?.deliveryType !== 'collection' && order?.deliveryType !== 'free'