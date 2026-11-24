import { adminAuth, adminDb, FieldValue } from './_lib/admin.js'
import { COLLECTION, notifyEvent } from './_lib/notifications.js'

const ELIGIBLE = {
  booking: ['confirmed', 'completed'],
  order: ['confirmed', 'shipped', 'delivered'],
}

const KNOWN = ['not_found', 'forbidden', 'not_paid', 'pending', 'status']

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
    const { kind, id } = body
    const col = COLLECTION[kind]
    if (!col || typeof id !== 'string' || !id) return fail(res, 400, 'request')

    const reason = String(body.reason || '').trim().slice(0, 1000)
    if (!reason) return fail(res, 400, 'reason')

    const ref = adminDb.collection(col).doc(id)
    const refundRef = adminDb.collection('refunds').doc()

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) throw new Error('not_found')
      const item = snap.data()
      if (item.buyerId !== decoded.uid) throw new Error('forbidden')
      if (item.paymentStatus !== 'paid') throw new Error('not_paid')
      if (item.refundStatus === 'requested') throw new Error('pending')
      if (!ELIGIBLE[kind].includes(item.status)) throw new Error('status')

      const total = kind === 'booking' ? item.priceCents : item.totalCents
      const amountCents = item.paidCents ?? total ?? 0

      tx.set(refundRef, {
        kind,
        refId: id,
        paymentId: item.paymentId || '',
        buyerId: item.buyerId,
        buyerName: item.buyerName || '',
        buyerEmail: item.buyerEmail || '',
        sellerId: item.sellerId,
        sellerName: item.sellerName || '',
        title: item.listingTitle || '',
        amountCents,
        itemStatus: item.status,
        reason,
        status: 'requested',
        createdAt: FieldValue.serverTimestamp(),
      })

      tx.update(ref, {
        refundStatus: 'requested',
        refundId: refundRef.id,
        refundReason: reason,
        refundNote: FieldValue.delete(),
        refundRequestedAt: FieldValue.serverTimestamp(),
        'notified.refund_requested': FieldValue.delete(),
        'notified.refund_rejected': FieldValue.delete(),
        'notified.refunded': FieldValue.delete(),
      })
    })

    try {
      await notifyEvent({ kind, id, event: 'refund_requested', actor: 'buyer' })
    } catch (err) {
      console.error('refund-request: email failed', err)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    if (KNOWN.includes(err.message)) {
      const status = err.message === 'not_found' ? 404 : err.message === 'forbidden' ? 403 : 409
      return fail(res, status, err.message)
    }
    console.error('refund-request', err)
    return fail(res, 500, 'server')
  }
}