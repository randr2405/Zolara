import { adminAuth, adminDb, FieldValue } from './admin.js'
import { formatWhen, sendEmail, siteUrl, zar } from './email.js'

export const COLLECTION = { booking: 'bookings', order: 'orders' }

async function sellerEmail(sellerId) {
  try {
    return (await adminAuth.getUser(sellerId)).email || ''
  } catch (err) {
    console.error('notifications: seller lookup failed', err)
    return ''
  }
}

function messages({ kind, event, item, actor, supplierTo }) {
  const isBooking = kind === 'booking'
  const noun = isBooking ? 'booking' : 'order'
  const title = item.listingTitle || (isBooking ? 'Your booking' : 'Your order')
  const total = isBooking
    ? item.priceCents
    : item.totalCents ?? (item.priceCents || 0) * (item.quantity || 1)
  const buyerLink = `${siteUrl()}${isBooking ? '/my-bookings' : '/my-orders'}`
  const sellerLink = `${siteUrl()}${isBooking ? '/seller/bookings' : '/seller/orders'}`

  const details = [
    ['Item', title],
    isBooking ? ['When', formatWhen(item.date, item.time)] : ['Quantity', item.quantity],
    ['Total', zar(total)],
  ]
  const buyerTo = item.buyerEmail
  const buyerName = item.buyerName || 'there'
  const sellerName = item.sellerName || 'the supplier'

  switch (event) {
    case 'requested':
      return [
        {
          to: supplierTo,
          subject: `New ${noun} request: ${title}`,
          heading: `You have a new ${noun} request`,
          lines: [
            `${buyerName} has sent you a ${noun} request on Zolara.`,
            'Please accept or decline it as soon as you can. The customer cannot pay until you accept.',
          ],
          details,
          button: { label: `View ${noun} requests`, url: sellerLink },
        },
        {
          to: buyerTo,
          subject: `We have sent your ${noun} request to ${sellerName}`,
          heading: `Your ${noun} request is with ${sellerName}`,
          lines: [
            'No payment is taken now. When the supplier accepts, we will email you and you can pay securely through PayFast.',
          ],
          details,
          button: { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
      ]

    case 'confirmed':
      return [
        {
          to: buyerTo,
          subject: `${sellerName} accepted your ${noun}`,
          heading: `Your ${noun} was accepted`,
          lines: [
            `${sellerName} has accepted your ${noun}. To go ahead, please pay securely through PayFast.`,
          ],
          details,
          button: { label: 'Pay now', url: buyerLink },
        },
      ]

    case 'declined':
      return [
        {
          to: buyerTo,
          subject: `Your ${noun} request was declined`,
          heading: `Your ${noun} request was declined`,
          lines: [
            `Unfortunately ${sellerName} could not accept this ${noun}. No payment was taken.`,
            'You are welcome to look for another supplier on Zolara.',
          ],
          details,
          button: { label: 'Browse the shop', url: `${siteUrl()}/shop` },
        },
      ]

    case 'cancelled': {
      const byBuyer = actor === 'buyer'
      return [
        {
          to: byBuyer ? supplierTo : buyerTo,
          subject: `${isBooking ? 'Booking' : 'Order'} cancelled: ${title}`,
          heading: `This ${noun} was cancelled`,
          lines: [
            byBuyer
              ? `${buyerName} has cancelled this ${noun}.`
              : `${sellerName} has cancelled this ${noun}. No payment was taken.`,
          ],
          details,
          button: byBuyer
            ? { label: `View ${noun}s`, url: sellerLink }
            : { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
      ]
    }

    case 'paid': {
      const paid = item.paidCents ?? total
      const paidDetails = [...details.slice(0, -1), ['Paid', zar(paid)]]
      return [
        {
          to: buyerTo,
          subject: `Payment received: ${title}`,
          heading: 'Payment received',
          lines: [
            `Thank you. PayFast has confirmed your payment to ${sellerName}.`,
            isBooking
              ? 'The supplier will provide your service as arranged.'
              : 'The supplier will now prepare your order and let you know when it ships.',
          ],
          details: paidDetails,
          button: { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
        {
          to: supplierTo,
          subject: `Customer has paid: ${title}`,
          heading: 'Your customer has paid',
          lines: [
            `${buyerName} has paid for this ${noun}, so you can go ahead.`,
            isBooking
              ? 'Please mark the booking as completed once the service is done.'
              : 'Please mark the order as shipped when it goes out, and as delivered when it arrives.',
          ],
          details: paidDetails,
          button: { label: `View ${noun}s`, url: sellerLink },
        },
      ]
    }

    case 'shipped':
      return [
        {
          to: buyerTo,
          subject: `Your order is on its way: ${title}`,
          heading: 'Your order is on its way',
          lines: [`${sellerName} has marked your order as shipped.`],
          details,
          button: { label: 'View my orders', url: buyerLink },
        },
      ]

    case 'delivered':
      return [
        {
          to: buyerTo,
          subject: `Your order was delivered: ${title}`,
          heading: 'Your order was delivered',
          lines: [
            'Please tell us whether you were satisfied. It takes a few seconds and helps other customers.',
          ],
          details,
          button: { label: 'Give feedback', url: buyerLink },
        },
      ]

    case 'completed':
      return [
        {
          to: buyerTo,
          subject: `Your service is complete: ${title}`,
          heading: 'Your service is complete',
          lines: [
            'Please tell us whether you were satisfied. It takes a few seconds and helps other customers.',
          ],
          details,
          button: { label: 'Give feedback', url: buyerLink },
        },
      ]

    default:
      return []
  }
}

// Sends the emails for one event on one booking/order, at most once per event.
// actor: 'buyer' | 'seller' (only used for cancellations).
// Returns true if emails went out, false if already sent or the item is missing.
export async function notifyEvent({ kind, id, event, actor }) {
  const col = COLLECTION[kind]
  if (!col) return false
  const ref = adminDb.collection(col).doc(id)
  const claimKey = `notified.${event}`

  const item = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const data = snap.data()
    if (data.notified?.[event]) return null
    tx.update(ref, { [claimKey]: true })
    return data
  })
  if (!item) return false

  try {
    const needsSupplier = event === 'requested' || event === 'paid' || event === 'cancelled'
    const supplierTo = needsSupplier ? await sellerEmail(item.sellerId) : ''
    const list = messages({ kind, event, item, actor, supplierTo }).filter((m) => m.to)
    await Promise.all(list.map((m) => sendEmail(m)))
    return true
  } catch (err) {
    // Release the claim so a later retry can send it.
    await ref.update({ [claimKey]: FieldValue.delete() }).catch(() => {})
    throw err
  }
}