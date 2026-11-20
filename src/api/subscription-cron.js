import { adminDb, FieldValue } from './_lib/admin.js'

const SUBSCRIPTION_CENTS = 25000
const FREE_MONTHS = 3
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function addMonths(date, n) {
  const d = new Date(date.getTime())
  const day = d.getUTCDate()
  d.setUTCMonth(d.getUTCMonth() + n)
  if (d.getUTCDate() !== day) d.setUTCDate(0)
  return d
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end()

  try {
    const now = new Date()
    const month = now.getUTCMonth()
    const year = now.getUTCFullYear()
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const note = `Subscription ${MONTHS[month]} ${year}`

    const [sellers, existing] = await Promise.all([
      adminDb.collection('sellers').get(),
      adminDb.collection('ledger').where('type', '==', 'subscription').get(),
    ])
    const charged = new Set(existing.docs.map((d) => `${d.data().sellerId}|${d.data().note}`))

    const result = { month: key, charged: 0, alreadyCharged: 0, stillFree: 0, skipped: 0, noApprovalDate: [] }

    for (const doc of sellers.docs) {
      const s = doc.data()
      const status = s.status || (s.verified ? 'approved' : 'pending')
      if (status !== 'approved' || s.subscriptionExempt === true) {
        result.skipped += 1
        continue
      }
      const approvedAt = s.decidedAt?.toDate?.()
      if (!approvedAt) {
        result.noApprovalDate.push(doc.id)
        continue
      }
      if (now < addMonths(approvedAt, FREE_MONTHS)) {
        result.stillFree += 1
        continue
      }
      if (charged.has(`${doc.id}|${note}`)) {
        result.alreadyCharged += 1
        continue
      }
      try {
        await adminDb.collection('ledger').doc(`sub_${doc.id}_${key}`).create({
          sellerId: doc.id,
          sellerName: s.businessName || '',
          type: 'subscription',
          effectCents: -SUBSCRIPTION_CENTS,
          note,
          auto: true,
          createdBy: 'system',
          createdAt: FieldValue.serverTimestamp(),
        })
        result.charged += 1
      } catch (err) {
        if (err.code === 6 || /already exists/i.test(String(err.message))) result.alreadyCharged += 1
        else throw err
      }
    }

    console.log('subscription-cron', JSON.stringify(result))
    return res.status(200).json(result)
  } catch (err) {
    console.error('subscription-cron', err)
    return res.status(500).json({ error: 'server' })
  }
}