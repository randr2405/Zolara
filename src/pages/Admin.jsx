import { useEffect, useState } from 'react'
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const statusOf = (s) => s.status || (s.verified ? 'approved' : 'pending')

async function decide(seller, status, reason = '') {
  const approved = status === 'approved'
  const head = writeBatch(db)
  head.update(doc(db, 'sellers', seller.id), {
    status, verified: approved, decidedAt: serverTimestamp(),
  })
  head.set(doc(db, 'sellerDecisions', seller.id), {
    status, reason, decidedAt: serverTimestamp(),
  })
  await head.commit()

  // Show or hide all of this supplier's listings
  const listings = await getDocs(query(collection(db, 'listings'), where('sellerId', '==', seller.id)))
  for (let i = 0; i < listings.docs.length; i += 10) {
    const batch = writeBatch(db)
    listings.docs.slice(i, i + 10).forEach((l) => batch.update(l.ref, { sellerApproved: approved }))
    await batch.commit()
  }
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <p className="text-sm">
      <span className="text-gold-deep">{label}: </span>
      <span className="whitespace-pre-line">{value}</span>
    </p>
  )
}

function SellerCard({ seller, status }) {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setOpen(!open)
    if (!details) {
      try {
        const [app, usr] = await Promise.all([
          getDoc(doc(db, 'applications', seller.id)),
          getDoc(doc(db, 'users', seller.id)),
        ])
        setDetails({ app: app.exists() ? app.data() : {}, email: usr.exists() ? usr.data().email : '' })
      } catch (err) {
        console.error(err)
        setError('Could not load details.')
      }
    }
  }

  async function act(newStatus, label, askReason) {
    let reason = ''
    if (askReason) {
      reason = window.prompt(`${label} ${seller.businessName}. Reason (the supplier will see this):`)
      if (reason === null) return
    } else if (!window.confirm(`${label} ${seller.businessName}?`)) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await decide(seller, newStatus, reason)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Check the console and your rules, then try again.')
    } finally {
      setBusy(false)
    }
  }

  const when = seller.acceptedRulesAt?.toDate?.().toLocaleDateString('en-ZA')

  return (
    <li className="rounded-xl bg-white p-4">
      <div className="flex items-center gap-3">
        {seller.logoUrl
          ? <img src={seller.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          : <div className="h-12 w-12 rounded-full bg-cream" />}
        <div className="flex-1">
          <p className="font-medium">{seller.businessName}</p>
          <p className="text-xs">{seller.city} · {seller.phone}</p>
        </div>
        <button onClick={toggle} className="text-sm text-emerald-brand underline">
          {open ? 'Hide details' : 'View details'}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-1 border-t border-gold/40 pt-3">
          <Row label="Email" value={details?.email} />
          <Row label="About" value={seller.description} />
          <Row label="Registration number" value={details?.app?.registrationNumber} />
          <Row label="References" value={details?.app?.references} />
          <Row label="Examples of work" value={details?.app?.examples} />
          <Row label="Agreed to rules" value={when && `${when} (version ${seller.rulesVersion || '1.0'})`} />
          {details && !details.app?.references && (
            <p className="text-xs text-gold-deep">No application details on file for this supplier.</p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-3 flex gap-3">
        {status === 'pending' && (
          <>
            <button disabled={busy} onClick={() => act('approved', 'Approve', false)}
              className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream disabled:opacity-60">
              Approve
            </button>
            <button disabled={busy} onClick={() => act('rejected', 'Reject', true)}
              className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700 disabled:opacity-60">
              Reject
            </button>
          </>
        )}
        {status === 'approved' && (
          <button disabled={busy} onClick={() => act('removed', 'Remove', true)}
            className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700 disabled:opacity-60">
            Remove supplier
          </button>
        )}
        {(status === 'rejected' || status === 'removed') && (
          <button disabled={busy} onClick={() => act('approved', 'Reinstate', false)}
            className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream disabled:opacity-60">
            Reinstate
          </button>
        )}
      </div>
    </li>
  )
}

export default function Admin() {
  const [sellers, setSellers] = useState(null)
  const [tab, setTab] = useState('pending')
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'sellers'),
        (snap) => setSellers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => { console.error(err); setError('Could not load suppliers.') }
      ),
    []
  )

  if (error) return <p className="p-6 text-center text-red-700">{error}</p>
  if (!sellers) return <p className="p-6 text-center">Loading…</p>

  const groups = {
    pending: sellers.filter((s) => statusOf(s) === 'pending'),
    approved: sellers.filter((s) => statusOf(s) === 'approved'),
    closed: sellers.filter((s) => ['rejected', 'removed'].includes(statusOf(s))),
  }
  const tabs = [['pending', 'Pending'], ['approved', 'Approved'], ['closed', 'Rejected / removed']]

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Admin: suppliers</h1>
      <p className="mb-6 text-sm">
        Approving a supplier makes their listings visible to customers. Rejecting or removing hides them.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === v ? 'bg-emerald-brand text-cream' : 'border border-gold-deep text-gold-deep'}`}>
            {label} ({groups[v].length})
          </button>
        ))}
      </div>

      {groups[tab].length === 0 && <p className="text-sm">Nobody here.</p>}

      <ul className="flex flex-col gap-3">
        {groups[tab].map((s) => (
          <SellerCard key={s.id} seller={s} status={statusOf(s)} />
        ))}
      </ul>
    </main>
  )
}