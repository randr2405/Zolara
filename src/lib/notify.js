import { auth } from './firebase'

// Asks the server to send the email(s) for a booking/order event.
// Never throws: a failed email must not break the action the person just did.
export async function notify(kind, id, event) {
  try {
    const user = auth.currentUser
    if (!user) return
    const token = await user.getIdToken()
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, id, event }),
      keepalive: true,
    })
  } catch (err) {
    console.error('notify', err)
  }
}