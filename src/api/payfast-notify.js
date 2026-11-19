import { adminDb, FieldValue } from './_lib/admin.js'
import { isPayFastIp, paramString, sign, validateWithPayFast, withPassphrase } from './_lib/payfast.js'

const COLLECTION = { booking: 'bookings', order: 'orders' }

async function readRaw(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  let raw = Buffer.concat(chunks).toString('utf8')
  if (!raw && req.body) {
    raw = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString()
  }
  return raw
}

function parse(raw) {
  return raw
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf('=')
      const k = i === -1 ? pair : pair.slice(0, i)
      const v = i === -1 ? '' : pair.slice(i + 1)
      return [decodeURIComponent(k.replace(/\+/g, ' ')), decodeURIComponent(v.replace(/\+/g, ' '))]
    })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const raw = await readRaw(req)
    const entries = parse(raw)
    const data = Object.fromEntries(entries)
    const unsigned = entries.filter(([k]) => k !== 'signature')
    const base = paramString(unsigned)

    if (sign(withPassphrase(base)) !== data.signature) {
      console.error('payfast-notify: bad signature')
      return res.status(400).end()
    }

    const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim()
    if (!(await isPayFastIp(ip))) {
      console.error('payfast-notify: bad ip', ip)
      return res.status(400).end()
    }

    if (data.merchant_id !== process.env.PAYFAST_MERCHANT_ID) {
      console.error('payfast-notify: merchant mismatch')
      return res.status(400).end()
    }

    const payRef = adminDb.collection('payments').doc(String(data.m_payment_id || '_'))
    const paySnap = await payRef.get()
    if (!paySnap.exists) {
      console.error('payfast-notify: unknown payment')
      return res.status(400).end()
    }
    const payment = paySnap.data()

    const gross = parseFloat(data.amount_gross)
    if (!Number.isFinite(gross) || Math.abs(gross - payment.amountCents / 100) > 0.01) {
      console.error('payfast-notify: amount mismatch', gross, payment.amountCents)
      return res.status(400).end()
    }

    if (!(await validateWithPayFast(base))) {
      console.error('payfast-notify: server validation failed')
      return res.status(400).end()
    }

    if (data.payment_status !== 'COMPLETE') {
      if (payment.status === 'pending') {
        await payRef.update({
          status: String(data.payment_status || 'failed').toLowerCase(),
          pfPaymentId: data.pf_payment_id || '',
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      return res.status(200).end()
    }

    await adminDb.runTransaction(async (tx) => {
      const current = await tx.get(payRef)
      const p = current.data()
      if (p.status === 'paid') return
      const itemRef = adminDb.collection(COLLECTION[p.kind]).doc(p.refId)
      const itemSnap = await tx.get(itemRef)
      const itemOk = itemSnap.exists && itemSnap.data().status === 'confirmed'
      tx.update(payRef, {
        status: 'paid',
        pfPaymentId: data.pf_payment_id || '',
        amountGross: gross,
        amountFee: parseFloat(data.amount_fee) || 0,
        amountNet: parseFloat(data.amount_net) || 0,
        needsAttention: !itemOk,
        paidAt: FieldValue.serverTimestamp(),
      })
      if (itemSnap.exists) {
        tx.update(itemRef, {
          paymentStatus: 'paid',
          paymentId: payRef.id,
          paidCents: p.amountCents,
          paidAt: FieldValue.serverTimestamp(),
        })
      }
    })

    return res.status(200).end()
  } catch (err) {
    console.error('payfast-notify', err)
    return res.status(500).end()
  }
}