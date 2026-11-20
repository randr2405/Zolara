import { adminAuth, adminDb } from './_lib/admin.js'
import { COLLECTION, notifyEvent } from './_lib/notifications.js'

// Events the supplier may trigger, per kind. "paid" is never accepted here:
// it is sent from payfast-notify after PayFast confirms the payment.
const SELLER_EVENTS = {
  booking: ['confirmed', 'declined', 'completed'],
  order: ['confirmed', 'declined', 'shipped', 'delivered'],
}

function fail(res, status, error) {
  return res.status(status).json({ error })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'method')
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return fail(res, 401, 'auth')
    const decoded = await adminAuth.verifyIdToken(token)

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { kind, id, event } = body
    const col = COLLECTION[kind]
    if (!col || typeof id !== 'string' || !id || typeof event !== 'string') {
      return fail(res, 400, 'request')
    }

    const snap = await adminDb.collection(col).doc(id).get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    const item = snap.data()

    const role = decoded.uid === item.buyerId ? 'buyer' : decoded.uid === item.sellerId ? 'seller' : null
    if (!role) return fail(res, 403, 'forbidden')

    if (event === 'requested') {
      if (role !== 'buyer') return fail(res, 403, 'forbidden')
    } else if (event === 'cancelled') {
      if (item.status !== 'cancelled') return fail(res, 409, 'status')
    } else if (SELLER_EVENTS[kind].includes(event)) {
      if (role !== 'seller') return fail(res, 403, 'forbidden')
      if (item.status !== event) return fail(res, 409, 'status')
    } else {
      return fail(res, 400, 'event')
    }

    const sent = await notifyEvent({ kind, id, event, actor: role })
    return res.status(200).json({ sent })
  } catch (err) {
    console.error('notify', err)
    return fail(res, 500, 'server')
  }
}