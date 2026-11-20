import { sendEmail } from './_lib/email.js'

const TOPICS = [
  'Question about an order or booking',
  'Refund',
  'Selling on Zolara',
  'My account or personal data',
  'Report a problem or a supplier',
  'Something else',
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const adminEmail = () =>
  process.env.ADMIN_EMAIL || process.env.EMAIL_REPLY_TO || 'info@rragencies.co.za'

const clean = (value, max) =>
  String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)

function fail(res, status, error) {
  return res.status(status).json({ error })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'method')
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    if (body.website) return res.status(200).json({ ok: true })
    if (Number(body.elapsed) < 3000) return res.status(200).json({ ok: true })

    const name = clean(body.name, 100)
    const email = clean(body.email, 200)
    const topic = TOPICS.includes(body.topic) ? body.topic : 'Something else'
    const message = String(body.message || '').replace(/\r/g, '').trim()

    if (!name || !email || !message) return fail(res, 400, 'fields')
    if (!EMAIL.test(email)) return fail(res, 400, 'email')
    if (message.length < 10 || message.length > 2000) return fail(res, 400, 'length')

    await sendEmail({
      to: adminEmail(),
      replyTo: email,
      subject: `Contact form: ${topic}`,
      heading: 'New message from the contact form',
      lines: message.split('\n').filter((l) => l.trim()),
      details: [
        ['Name', name],
        ['Email', email],
        ['Topic', topic],
      ],
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contact', err)
    return fail(res, 500, 'server')
  }
}