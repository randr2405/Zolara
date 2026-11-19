import { auth } from './firebase'

const MESSAGES = {
  not_confirmed: 'The supplier has not accepted this yet.',
  already_paid: 'This has already been paid.',
  listing: 'This listing is no longer available. Please contact the supplier.',
  amount: 'The amount could not be worked out. Please contact the supplier.',
}

export function paymentErrorMessage(err) {
  return MESSAGES[err?.message] || 'Could not start the payment. Please try again.'
}

export async function startPayment(kind, id) {
  const user = auth.currentUser
  if (!user) throw new Error('auth')
  const token = await user.getIdToken()
  const res = await fetch('/api/payfast-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, id }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'server')

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = data.action
  data.fields.forEach(([name, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}