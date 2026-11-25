import { adminAuth, adminDb, FieldValue } from './_lib/admin.js'
import { PROCESS_URL, paramString, sign, withPassphrase } from './_lib/payfast.js'

const COLLECTION = { booking: 'bookings', order: 'orders' }

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

    const snap = await adminDb.collection(col).doc(id).get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    const item = snap.data()
    if (item.buyerId !== decoded.uid) return fail(res, 403, 'forbidden')
    if (item.status !== 'confirmed') return fail(res, 409, 'not_confirmed')
    if (item.paymentStatus === 'paid') return fail(res, 409, 'already_paid')

    const listing = await adminDb.collection('listings').doc(item.listingId).get()
    if (!listing.exists) return fail(res, 409, 'listing')
    const unit = listing.data().priceCents
    const quantity = kind === 'order' ? item.quantity : 1
    const deliveryCents = kind === 'order' && item.deliveryCents !== undefined ? item.deliveryCents : 0
    if (
      !Number.isInteger(unit) || !Number.isInteger(quantity) || unit < 1 || quantity < 1 ||
      !Number.isInteger(deliveryCents) || deliveryCents < 0
    ) {
      return fail(res, 409, 'amount')
    }
    const itemsCents = unit * quantity
    const amountCents = itemsCents + deliveryCents

    const payRef = adminDb.collection('payments').doc()
    await payRef.set({
      kind,
      refId: id,
      buyerId: item.buyerId,
      sellerId: item.sellerId,
      sellerName: item.sellerName || '',
      title: item.listingTitle || '',
      itemsCents,
      deliveryCents,
      amountCents,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    const site = (process.env.SITE_URL || '').replace(/\/$/, '')
    const names = String(item.buyerName || '').trim().split(/\s+/)
    const entries = [
      ['merchant_id', process.env.PAYFAST_MERCHANT_ID],
      ['merchant_key', process.env.PAYFAST_MERCHANT_KEY],
      ['return_url', `${site}/payment/success?type=${kind}&id=${id}`],
      ['cancel_url', `${site}/payment/cancelled?type=${kind}&id=${id}`],
      ['notify_url', `${site}/api/payfast-notify`],
      ['name_first', names[0]],
      ['name_last', names.slice(1).join(' ')],
      ['email_address', item.buyerEmail],
      ['m_payment_id', payRef.id],
      ['amount', (amountCents / 100).toFixed(2)],
      ['item_name', String(item.listingTitle || 'Zolara order').slice(0, 100)],
      ['custom_str1', kind],
      ['custom_str2', id],
    ]
      .map(([k, v]) => [k, v === undefined || v === null ? '' : String(v).trim()])
      .filter(([, v]) => v !== '')

    const signature = sign(withPassphrase(paramString(entries)))
    return res.status(200).json({ action: PROCESS_URL, fields: [...entries, ['signature', signature]] })
  } catch (err) {
    console.error('payfast-create', err)
    return fail(res, 500, 'server')
  }
}