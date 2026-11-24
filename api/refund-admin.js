import { adminAuth, adminDb, FieldValue } from './_lib/admin.js'
import { COLLECTION, notifyEvent } from './_lib/notifications.js'

function fail(res, status, error) {
  return res.status(status).json({ error })
}

function plain(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(plain)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]))
  }
  return value
}

async function requireAdmin(req) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return null
    const decoded = await adminAuth.verifyIdToken(token)
    const snap = await adminDb.collection('admins').doc(decoded.uid).get()
    return snap.exists ? decoded : null
  } catch (err) {
    return null
  }
}

async function list(res) {
  const snap = await adminDb.collection('refunds').orderBy('createdAt', 'desc').limit(200).get()
  const refunds = snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }))
  const refs = refunds.filter((r) => r.paymentId).map((r) => adminDb.collection('payments').doc(r.paymentId))
  const paySnaps = refs.length ? await adminDb.getAll(...refs) : []
  const payments = {}
  paySnaps.forEach((s) => {
    if (s.exists) payments[s.id] = s.data()
  })
  return res.status(200).json({
    refunds: refunds.map((r) => ({
      ...r,
      pfPaymentId: payments[r.paymentId]?.pfPaymentId || '',
      feeCents: payments[r.paymentId]?.feeCents || 0,
    })),
  })
}

async function process(req, res, admin) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  const { refundId, action } = body
  const note = String(body.note || '').trim().slice(0, 1000)
  if (typeof refundId !== 'string' || !refundId || !['refund', 'reject'].includes(action)) {
    return fail(res, 400, 'request')
  }

  const refundRef = adminDb.collection('refunds').doc(refundId)
  let outcome
  try {
    outcome = await adminDb.runTransaction(async (tx) => {
      const refundSnap = await tx.get(refundRef)
      if (!refundSnap.exists) throw new Error('not_found')
      const refund = refundSnap.data()
      if (refund.status !== 'requested') throw new Error('done')

      const itemRef = adminDb.collection(COLLECTION[refund.kind]).doc(refund.refId)
      const itemSnap = await tx.get(itemRef)
      const item = itemSnap.exists ? itemSnap.data() : null
      const payRef = refund.paymentId ? adminDb.collection('payments').doc(refund.paymentId) : null
      const paySnap = payRef ? await tx.get(payRef) : null
      const restock = action === 'refund' && refund.kind === 'order' && item && item.status === 'confirmed' && item.listingId
      const listingRef = restock ? adminDb.collection('listings').doc(item.listingId) : null
      const listingSnap = listingRef ? await tx.get(listingRef) : null
      const now = FieldValue.serverTimestamp()

      if (action === 'reject') {
        tx.update(refundRef, { status: 'rejected', adminNote: note, processedAt: now, processedBy: admin.uid })
        if (item) tx.update(itemRef, { refundStatus: 'rejected', refundNote: note })
      } else {
        tx.update(refundRef, { status: 'refunded', adminNote: note, processedAt: now, processedBy: admin.uid })
        if (item) {
          const update = {
            paymentStatus: 'refunded',
            refundStatus: 'refunded',
            refundedCents: refund.amountCents,
            refundedAt: now,
            refundNote: note,
          }
          if (item.status === 'confirmed') {
            update.status = 'cancelled'
            update.updatedAt = now
          }
          tx.update(itemRef, update)
        }
        if (paySnap && paySnap.exists) tx.update(payRef, { status: 'refunded', refundedAt: now })
        if (listingSnap && listingSnap.exists) {
          tx.update(listingRef, { stock: (listingSnap.data().stock ?? 0) + (item.quantity || 0) })
        }
      }
      return { kind: refund.kind, id: refund.refId, itemExists: Boolean(item) }
    })
  } catch (err) {
    if (err.message === 'not_found') return fail(res, 404, 'not_found')
    if (err.message === 'done') return fail(res, 409, 'done')
    throw err
  }

  if (outcome.itemExists) {
    try {
      await notifyEvent({
        kind: outcome.kind,
        id: outcome.id,
        event: action === 'refund' ? 'refunded' : 'refund_rejected',
      })
    } catch (err) {
      console.error('refund-admin: email failed', err)
    }
  }

  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return fail(res, 405, 'method')
  try {
    const admin = await requireAdmin(req)
    if (!admin) return fail(res, 403, 'forbidden')
    if (req.method === 'GET') return await list(res)
    return await process(req, res, admin)
  } catch (err) {
    console.error('refund-admin', err)
    return fail(res, 500, 'server')
  }
}