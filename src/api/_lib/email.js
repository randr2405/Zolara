// Sends transactional email through Resend's REST API (no extra npm package needed).
// Env vars: RESEND_API_KEY (required), EMAIL_FROM (e.g. "Zolara <notifications@yourdomain.co.za>"),
// EMAIL_REPLY_TO (optional), SITE_URL (already used by PayFast).

const COLORS = { emerald: '#0B3D2E', gold: '#C9A24B', goldDeep: '#A67C2E', cream: '#FAF6EE', charcoal: '#2B2B2B' }

export const siteUrl = () => (process.env.SITE_URL || '').replace(/\/$/, '')

export const zar = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format((cents || 0) / 100)

export function formatWhen(date, time) {
  if (!date) return ''
  const d = new Date(`${date}T12:00:00`)
  const day = d.toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
  return time ? `${day} at ${time}` : day
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

export function render({ heading, lines = [], details = [], button }) {
  const paras = lines
    .map((l) => `<p style="margin:0 0 12px;line-height:1.55;font-size:15px;">${esc(l)}</p>`)
    .join('')

  const rows = details
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${COLORS.goldDeep};font-size:13px;vertical-align:top;">${esc(k)}</td>` +
        `<td style="padding:6px 0;font-size:14px;">${esc(v)}</td></tr>`
    )
    .join('')

  const table = rows
    ? `<table role="presentation" style="margin:8px 0 16px;border-top:1px solid #E6D9B8;border-collapse:collapse;width:100%;">${rows}</table>`
    : ''

  const btn = button
    ? `<p style="margin:20px 0 4px;"><a href="${esc(button.url)}" style="display:inline-block;background:${COLORS.emerald};color:${COLORS.cream};text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;">${esc(button.label)}</a></p>`
    : ''

  const html = `<!doctype html><html><body style="margin:0;background:${COLORS.cream};font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${COLORS.charcoal};">
<table role="presentation" width="100%" style="background:${COLORS.cream};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${COLORS.emerald};padding:18px 24px;color:${COLORS.cream};font-size:20px;font-weight:600;">Zolara</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px;font-size:20px;color:${COLORS.emerald};">${esc(heading)}</h1>
${paras}${table}${btn}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #E6D9B8;font-size:12px;color:${COLORS.goldDeep};">
Zolara is owned by R&amp;R Agencies. Shop it. Book it. Love it.
</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    heading,
    '',
    ...lines,
    '',
    ...details.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}: ${v}`),
    button ? `\n${button.label}: ${button.url}` : '',
    '\nZolara is owned by R&R Agencies.',
  ].join('\n')

  return { html, text }
}

export async function sendEmail({ to, subject, heading, lines, details, button, replyTo }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('email_not_configured')
  if (!to) return false

  const { html, text } = render({ heading, lines, details, button })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Zolara <onboarding@resend.dev>',
      to: [to],
      reply_to: replyTo || process.env.EMAIL_REPLY_TO || 'info@rragencies.co.za',
      subject,
      html,
      text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`resend ${res.status} ${body}`.slice(0, 300))
  }
  return true
}