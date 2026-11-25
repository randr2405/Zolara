import { adminAuth, adminDb, FieldValue } from './admin.js'
import { formatWhen, sendEmail, siteUrl, zar } from './email.js'

export const COLLECTION = { booking: 'bookings', order: 'orders' }

const adminEmail = () =>
  process.env.ADMIN_EMAIL || process.env.EMAIL_REPLY_TO || 'info@rragencies.co.za'

async function sellerEmail(sellerId) {
  try {
    return (await adminAuth.getUser(sellerId)).email || ''
  } catch (err) {
    console.error('notifications: seller lookup failed', err)
    return ''
  }
}

function deliveryText(item) {
  if (item.deliveryCents > 0) return zar(item.deliveryCents)
  if (item.deliveryType === 'collection') return 'Collection only'
  return 'Free'
}

function messages({ kind, event, item, actor, supplierTo, adminTo }) {
  const isBooking = kind === 'booking'
  const noun = isBooking ? 'booking' : 'order'
  const title = item.listingTitle || (isBooking ? 'Your booking' : 'Your order')
  const hasDelivery = !isBooking && Number.isInteger(item.deliveryCents)
  let total
  if (isBooking) total = item.priceCents
  else if (Number.isInteger(item.grandTotalCents)) total = item.grandTotalCents
  else total = item.totalCents ?? (item.priceCents || 0) * (item.quantity || 1)
  const buyerLink = `${siteUrl()}${isBooking ? '/my-bookings' : '/my-orders'}`
  const sellerLink = `${siteUrl()}${isBooking ? '/seller/bookings' : '/seller/orders'}`

  const details = [
    ['Item', title],
    isBooking ? ['When', formatWhen(item.date, item.time)] : ['Quantity', item.quantity],
    ...(hasDelivery ? [['Delivery', deliveryText(item)]] : []),
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
            isBooking
              ? 'Please accept or decline it as soon as you can. The customer cannot pay until you accept.'
              : 'Please accept or decline it as soon as you can. When you accept, you confirm the delivery cost. The customer cannot pay until you accept.',
          ],
          details,
          button: { label: `View ${noun} requests`, url: sellerLink },
        },
        {
          to: buyerTo,
          subject: `We have sent your ${noun} request to ${sellerName}`,
          heading: `Your ${noun} request is with ${sellerName}`,
          lines: [
            isBooking
              ? 'No payment is taken now. When the supplier accepts, we will email you and you can pay securely through PayFast.'
              : 'No payment is taken now. When the supplier accepts, we will email you the final total including delivery, and you can pay securely through PayFast.',
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
            hasDelivery
              ? `${sellerName} has accepted your order. The total below includes delivery. To go ahead, please pay securely through PayFast.`
              : `${sellerName} has accepted your ${noun}. To go ahead, please pay securely through PayFast.`,
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

    case 'refund_requested': {
      const refundDetails = [
        ...details.slice(0, -1),
        ['Paid', zar(item.paidCents ?? total)],
        ['Reason', item.refundReason],
      ]
      return [
        {
          to: adminTo,
          subject: `Refund request: ${title}`,
          heading: 'New refund request',
          lines: [`${buyerName} has asked for a refund on a paid ${noun} with ${sellerName}.`],
          details: refundDetails,
          button: { label: 'Review refund requests', url: `${siteUrl()}/admin/refunds` },
        },
        {
          to: buyerTo,
          subject: `We received your refund request: ${title}`,
          heading: 'Your refund request is with us',
          lines: [
            'The Zolara team will review it and email you with the outcome.',
            'Where a refund is due, we process it manually and it can take several business days.',
          ],
          details: refundDetails,
          button: { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
        {
          to: supplierTo,
          subject: `Refund requested: ${title}`,
          heading: 'A customer has requested a refund',
          lines: [
            `${buyerName} has asked Zolara for a refund on this ${noun}.`,
            'Zolara will review the request and let you know the outcome.',
          ],
          details: refundDetails,
          button: { label: `View ${noun}s`, url: sellerLink },
        },
      ]
    }

    case 'refunded': {
      const refunded = item.refundedCents ?? item.paidCents ?? total
      const refundDetails = [...details.slice(0, -1), ['Refunded', zar(refunded)]]
      return [
        {
          to: buyerTo,
          subject: `Your refund was processed: ${title}`,
          heading: 'Your refund was processed',
          lines: [
            `Zolara has refunded ${zar(refunded)} for this ${noun}.`,
            'Depending on how you paid, it can take several business days to reach you.',
            item.refundNote ? `Note: ${item.refundNote}` : '',
          ].filter(Boolean),
          details: refundDetails,
          button: { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
        {
          to: supplierTo,
          subject: `Customer refunded: ${title}`,
          heading: 'A payment was refunded',
          lines: [
            `Zolara has refunded ${buyerName} for this ${noun}.`,
            'This sale no longer counts towards your balance. We will contact you if it affects a payout.',
          ],
          details: refundDetails,
          button: { label: `View ${noun}s`, url: sellerLink },
        },
      ]
    }

    case 'refund_rejected':
      return [
        {
          to: buyerTo,
          subject: `Your refund request was declined: ${title}`,
          heading: 'Your refund request was declined',
          lines: [
            'Zolara reviewed your refund request and could not approve it.',
            item.refundNote ? `Note: ${item.refundNote}` : '',
            'If you disagree, please reply to this email.',
          ].filter(Boolean),
          details,
          button: { label: isBooking ? 'View my bookings' : 'View my orders', url: buyerLink },
        },
      ]

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
    const needsSupplier = ['requested', 'paid', 'cancelled', 'refund_requested', 'refunded'].includes(event)
    const adminTo = event === 'refund_requested' ? adminEmail() : ''
    const supplierTo = needsSupplier ? await sellerEmail(item.sellerId) : ''
    const list = messages({ kind, event, item, actor, supplierTo, adminTo }).filter((m) => m.to)
    await Promise.all(list.map((m) => sendEmail(m)))
    return true
  } catch (err) {
    await ref.update({ [claimKey]: FieldValue.delete() }).catch(() => {})
    throw err
  }
}