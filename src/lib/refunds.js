import { auth } from './firebase'

export const REFUND_ELIGIBLE = {
  booking: ['confirmed', 'completed'],
  order: ['confirmed', 'shipped', 'delivered'],
}

export const REFUND_STATUS = {
  requested: 'Open',
  refunded: 'Refunded',
  rejected: 'Declined',
}

const MESSAGES = {
  not_paid: 'This has not been paid, so there is nothing to refund.',
  pending: 'A refund request is already open for this.',
  status: 'A refund cannot be requested at this stage.',
  reason: 'Please tell us why you are asking for a refund.',
  forbidden: 'You cannot do this.',
  done: 'This request has already been dealt with.',
}

export function refundErrorMessage(err) {
  return MESSAGES[err?.message] || 'Something went wrong. Please try again.'
}

async function send(path, method, body) {
  const user = auth.currentUser
  if (!user) throw new Error('auth')
  const token = await user.getIdToken()
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'server')
  return data
}

export async function requestRefund(kind, id, reason) {
  await send('/api/refund-request', 'POST', { kind, id, reason })
}

export async function listRefunds() {
  const data = await send('/api/refund-admin', 'GET')
  return data.refunds || []
}

export async function processRefund(refundId, action, note) {
  await send('/api/refund-admin', 'POST', { refundId, action, note })
}