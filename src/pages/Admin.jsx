import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { STRIKE_LIMIT, STRIKE_WINDOW_DAYS, strikeLabel } from '../lib/strikes.js'

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

  const listings = await getDocs(query(collection(db, 'listings'), where('sellerId', '==', seller.id)))
  for (let i = 0; i < listings.docs.length; i += 10) {
    const batch = writeBatch(db)
    listings.docs.slice(i, i + 10).forEach((l) => batch.update(l.ref, { sellerApproved: approved }))
    await batch.commit()
  }
}

async function setPreferred(seller, value) {
  const head = writeBatch(db)
  head.update(doc(db, 'sellers', seller.id), { preferred: value })
  await head.commit()

  const listings = await getDocs(query(collection(db, 'listings'), where('sellerId', '==', seller.id)))
  for (let i = 0; i < listings.docs.length; i += 10) {
    const batch = writeBatch(db)
    listings.docs.slice(i, i + 10).forEach((l) => batch.update(l.ref, { sellerPreferred: value }))
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

function SellerCard({ seller, status, complaintCount, strikes }) {
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

  async function togglePreferred() {
    const next = !seller.preferred
    if (!window.confirm(`${next ? 'Make' : 'Stop making'} ${seller.businessName} a founder and preferred supplier?`)) return
    setBusy(true)
    setError('')
    try {
      await setPreferred(seller, next)
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
          <p className="font-medium">
            {seller.businessName}
            {seller.preferred && (
              <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs text-gold-deep">Preferred</span>
            )}
          </p>
          <p className="text-xs">
            {seller.city}
            {complaintCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                {complaintCount} {complaintCount === 1 ? 'complaint' : 'complaints'}{strikes > 0 ? `, ${strikes} upheld` : ''}
              </span>
            )}
          </p>
        </div>
        <button onClick={toggle} className="text-sm text-emerald-brand underline">
          {open ? 'Hide details' : 'View details'}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-1 border-t border-gold/40 pt-3">
          <Row label="Email" value={details?.email} />
          <Row label="Phone" value={details?.app?.phone || seller.phone} />
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
          <>
            <button disabled={busy} onClick={togglePreferred}
              className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
              {seller.preferred ? 'Remove preferred' : 'Make preferred'}
            </button>
            <button disabled={busy} onClick={() => act('removed', 'Remove', true)}
              className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700 disabled:opacity-60">
              Remove supplier
            </button>
          </>
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

function Complaints({ complaints, sellers, validCounts, onOpenSupplier }) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function review(c, status) {
    const prompt = status === 'valid'
      ? 'Uphold this complaint. Note for the supplier (optional):'
      : 'Dismiss this complaint. Note for the supplier (optional):'
    const note = window.prompt(prompt)
    if (note === null) return
    const data = { reviewStatus: status, reviewNote: note.trim(), reviewedAt: serverTimestamp() }
    if (status === 'valid') data.strikeNumber = (validCounts[c.sellerId] || 0) + 1
    setBusyId(c.id)
    setError('')
    try {
      await updateDoc(doc(db, 'feedback', c.id), data)
    } catch (err) {
      console.error(err)
      setError('Could not save the decision. Check your rules and try again.')
    } finally {
      setBusyId('')
    }
  }

  if (complaints.length === 0) return <p className="text-sm">No complaints.</p>

  return (
    <>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <ul className="flex flex-col gap-3">
        {complaints.map((c) => {
          const seller = sellers.find((s) => s.id === c.sellerId)
          const when = c.createdAt?.toDate?.().toLocaleDateString('en-ZA')
          const strikes = validCounts[c.sellerId] || 0
          const badge = c.reviewStatus === 'valid'
            ? 'Upheld'
            : c.reviewStatus === 'dismissed'
            ? 'Dismissed'
            : 'Needs review'
          return (
            <li key={c.id} className="rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.sellerName || seller?.businessName}</p>
                  <p className="text-sm text-gold-deep">{c.listingTitle}{when ? ` · ${when}` : ''}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${
                  c.reviewStatus ? 'bg-cream' : 'bg-red-100 text-red-700'}`}>
                  {badge}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm">{c.comment || 'No comment left.'}</p>

              <p className="mt-2 whitespace-pre-line text-sm">
                <span className="text-gold-deep">Supplier response: </span>
                {c.sellerResponse || 'None yet.'}
              </p>

              {c.reviewStatus && (
                <p className="mt-2 text-xs">
                  {c.reviewStatus === 'valid' && c.strikeNumber ? `Strike ${c.strikeNumber}: ${strikeLabel(c.strikeNumber)}. ` : ''}
                  {c.reviewNote ? `Note: ${c.reviewNote}` : ''}
                </p>
              )}

              <p className="mt-2 text-xs">
                Upheld complaints for this supplier in the last {STRIKE_WINDOW_DAYS} days: {strikes} of {STRIKE_LIMIT}
                {strikes >= STRIKE_LIMIT ? '. Removal threshold reached.' : ''}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!c.reviewStatus && (
                  <>
                    <button disabled={busyId === c.id} onClick={() => review(c, 'valid')}
                      className="rounded-full border border-red-700 px-4 py-2 text-sm text-red-700 disabled:opacity-60">
                      Uphold complaint
                    </button>
                    <button disabled={busyId === c.id} onClick={() => review(c, 'dismissed')}
                      className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
                      Dismiss
                    </button>
                  </>
                )}
                {seller && (
                  <button onClick={() => onOpenSupplier(statusOf(seller))}
                    className="text-sm text-emerald-brand underline">
                    Go to supplier ({statusOf(seller)})
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function Admin() {
  const [sellers, setSellers] = useState(null)
  const [complaints, setComplaints] = useState([])
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

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'feedback'), where('satisfied', '==', false)),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setComplaints(items)
        },
        (err) => console.error(err)
      ),
    []
  )

  if (error) return <p className="p-6 text-center text-red-700">{error}</p>
  if (!sellers) return <p className="p-6 text-center">Loading…</p>

  const counts = {}
  const validCounts = {}
  const windowStart = Date.now() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  complaints.forEach((c) => {
    counts[c.sellerId] = (counts[c.sellerId] || 0) + 1
    if (c.reviewStatus === 'valid' && (c.createdAt?.toMillis?.() || 0) >= windowStart) {
      validCounts[c.sellerId] = (validCounts[c.sellerId] || 0) + 1
    }
  })

  const groups = {
    pending: sellers.filter((s) => statusOf(s) === 'pending'),
    approved: sellers.filter((s) => statusOf(s) === 'approved'),
    closed: sellers.filter((s) => ['rejected', 'removed'].includes(statusOf(s))),
  }
  const tabs = [
    ['pending', 'Pending', groups.pending.length],
    ['approved', 'Approved', groups.approved.length],
    ['closed', 'Rejected / removed', groups.closed.length],
    ['complaints', 'Complaints to review', complaints.filter((c) => !c.reviewStatus).length],
  ]

  const openSupplier = (status) => setTab(status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : 'closed')

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Admin: suppliers</h1>
      <p className="mb-6 text-sm">
        Approving a supplier makes their listings visible to customers. Rejecting or removing hides them.
      </p>
      <p className="mb-6 text-sm">
        <Link to="/admin/reports" className="text-emerald-brand underline">Payments and reports</Link>
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map(([v, label, n]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === v ? 'bg-emerald-brand text-cream' : 'border border-gold-deep text-gold-deep'}`}>
            {label} ({n})
          </button>
        ))}
      </div>

      {tab === 'complaints' ? (
        <Complaints complaints={complaints} sellers={sellers} validCounts={validCounts} onOpenSupplier={openSupplier} />
      ) : (
        <>
          {groups[tab].length === 0 && <p className="text-sm">Nobody here.</p>}
          <ul className="flex flex-col gap-3">
            {groups[tab].map((s) => (
              <SellerCard key={s.id} seller={s} status={statusOf(s)} complaintCount={counts[s.id] || 0} strikes={validCounts[s.id] || 0} />
            ))}
          </ul>
        </>
      )}
    </main>
  )
}