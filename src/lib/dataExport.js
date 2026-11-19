import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { exportDataWorkbook } from './reportExport.js'

const HEAVY = ['thumb', 'logoUrl']

function plain(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(plain)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !HEAVY.includes(key))
        .map(([key, v]) => [key, plain(v)])
    )
  }
  return value
}

async function one(path, id) {
  const s = await getDoc(doc(db, path, id))
  return s.exists() ? plain(s.data()) : null
}

async function many(path, field, uid) {
  const s = await getDocs(query(collection(db, path), where(field, '==', uid)))
  return s.docs.map((d) => ({ id: d.id, ...plain(d.data()) }))
}

export async function exportUserData(uid) {
  const [
    account, sellerProfile, application, bankingDetails, supplierDecision,
    bookingsAsCustomer, bookingsAsSupplier, ordersAsCustomer, ordersAsSupplier,
    feedbackGiven, feedbackReceived, statement, listings,
  ] = await Promise.all([
    one('users', uid),
    one('sellers', uid),
    one('applications', uid),
    one('payoutDetails', uid),
    one('sellerDecisions', uid),
    many('bookings', 'buyerId', uid),
    many('bookings', 'sellerId', uid),
    many('orders', 'buyerId', uid),
    many('orders', 'sellerId', uid),
    many('feedback', 'buyerId', uid),
    many('feedback', 'sellerId', uid),
    many('ledger', 'sellerId', uid),
    many('listings', 'sellerId', uid),
  ])

  return {
    exportedAt: new Date().toISOString(),
    userId: uid,
    account,
    sellerProfile,
    application,
    bankingDetails,
    supplierDecision,
    listings,
    bookingsAsCustomer,
    bookingsAsSupplier,
    ordersAsCustomer,
    ordersAsSupplier,
    feedbackGiven,
    feedbackReceived,
    statement,
  }
}

export function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadExcel(filename, data) {
  await exportDataWorkbook(data, filename)
}