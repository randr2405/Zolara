export const NOTICE_VERSION = '1.0'

export const SERVICE_NOTICE = [
  'Zolara is a marketplace that connects customers with independent suppliers. The supplier, not Zolara, provides the service.',
  'To the extent the law allows, Zolara is not responsible or accountable for delays or problems with a service. Nothing here limits any rights you have under South African law.',
  'We take service seriously. After your service, please tell us whether you were satisfied. Suppliers who receive repeated valid complaints are removed from Zolara and must wait before they can apply again.',
  'Every supplier goes through a careful onboarding review, so that the products and services listed on Zolara are of good quality.',
]

export const BOOKING_STATUS = {
  requested: 'Waiting for supplier',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function formatWhen(date, time) {
  if (!date) return ''
  const d = new Date(`${date}T12:00:00`)
  const day = d.toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
  return time ? `${day} at ${time}` : day
}