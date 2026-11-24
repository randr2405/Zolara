import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import DataRequests from '../components/DataRequests.jsx'
import { STRIKE_LIMIT, STRIKE_WINDOW_DAYS, strikeLabel } from '../lib/strikes.js'
import { downloadWorkbook, stampDate } from '../lib/reportExport.js'

const statusOf = (s) => s.status || (s.verified ? 'approved' : 'pending')

const reviewLabel = (c) =>
  c.reviewStatus === 'valid' ? 'Upheld' : c.reviewStatus === 'dismissed' ? 'Dismissed' : 'Needs review'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnGold = `${btn} border border-gold-deep text-gold-deep hover:bg-gold-deep hover:text-white`
const btnDanger = `${btn} border border-red-700 text-red-700 hover:bg-red-700 hover:text-white`

const STATUS_STYLE = {
  pending: 'bg-cream text-gold-deep ring-1 ring-gold/60',
  approved: 'bg-emerald-brand text-cream',
  rejected: 'bg-red-100 text-red-800',
  removed: 'bg-red-100 text-red-800',
}

const ICONS = {
  chevron: 'M6 9l6 6 6-6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  chart: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3',
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

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

function Row({ label, value, wide }) {
  if (!value) return null
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium text-gold-deep">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm">{value}</dd>
    </div>
  )
}

function StrikeMeter({ strikes }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: STRIKE_LIMIT }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-8 rounded-full ${i < strikes ? 'bg-red-700' : 'bg-cream ring-1 ring-gold/50'}`}
          />
        ))}
      </div>
      <p className="text-xs">
        Upheld complaints for this supplier in the last {STRIKE_WINDOW_DAYS} days: {strikes} of {STRIKE_LIMIT}
        {strikes >= STRIKE_LIMIT ? '. Removal threshold reached.' : ''}
      </p>
    </div>
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
  const initial = (seller.businessName || '?').trim().charAt(0).toUpperCase()

  return (
    <li className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        {seller.logoUrl ? (
          <img src={seller.logoUrl} alt="" className="h-12 w-12 flex-none rounded-full object-cover sm:h-14 sm:w-14" />
        ) : (
          <div
            className="grid h-12 w-12 flex-none place-items-center rounded-full bg-emerald-brand font-display text-xl font-semibold text-gold sm:h-14 sm:w-14"
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-emerald-brand">{seller.businessName}</p>
          <p className="text-sm text-charcoal/70">{seller.city}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
              {status}
            </span>
            {seller.preferred && (
              <span className="rounded-full bg-cream px-3 py-0.5 text-xs font-medium text-gold-deep ring-1 ring-gold/60">
                Preferred
              </span>
            )}
            {complaintCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-medium text-red-800">
                {complaintCount} {complaintCount === 1 ? 'complaint' : 'complaints'}
                {strikes > 0 ? `, ${strikes} upheld` : ''}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex min-h-[44px] flex-none items-center gap-1 rounded-full px-3 text-sm font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {open ? 'Hide details' : 'View details'}
          <span className={`transition ${open ? 'rotate-180' : ''}`}>
            <Icon name="chevron" />
          </span>
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-gold/40 pt-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row label="Email" value={details?.email} />
            <Row label="Phone" value={details?.app?.phone || seller.phone} />
            <Row label="Registration number" value={details?.app?.registrationNumber} />
            <Row label="Agreed to rules" value={when && `${when} (version ${seller.rulesVersion || '1.0'})`} />
            <Row label="About" value={seller.description} wide />
            <Row label="References" value={details?.app?.references} wide />
            <Row label="Examples of work" value={details?.app?.examples} wide />
          </dl>
          {details && !details.app?.references && (
            <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">
              No application details on file for this supplier.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {status === 'pending' && (
          <>
            <button disabled={busy} onClick={() => act('approved', 'Approve', false)} className={btnPrimary}>
              Approve
            </button>
            <button disabled={busy} onClick={() => act('rejected', 'Reject', true)} className={btnDanger}>
              Reject
            </button>
          </>
        )}
        {status === 'approved' && (
          <>
            <button disabled={busy} onClick={togglePreferred} className={btnGold}>
              {seller.preferred ? 'Remove preferred' : 'Make preferred'}
            </button>
            <button disabled={busy} onClick={() => act('removed', 'Remove', true)} className={btnDanger}>
              Remove supplier
            </button>
          </>
        )}
        {(status === 'rejected' || status === 'removed') && (
          <button disabled={busy} onClick={() => act('approved', 'Reinstate', false)} className={btnPrimary}>
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

  if (complaints.length === 0) {
    return <p className="rounded-2xl border border-gold/40 bg-white p-6 text-center text-sm">No complaints.</p>
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {complaints.map((c) => {
          const seller = sellers.find((s) => s.id === c.sellerId)
          const when = c.createdAt?.toDate?.().toLocaleDateString('en-ZA')
          const strikes = validCounts[c.sellerId] || 0
          return (
            <li key={c.id} className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-emerald-brand">{c.sellerName || seller?.businessName}</p>
                  <p className="text-sm text-gold-deep">{c.listingTitle}{when ? ` · ${when}` : ''}</p>
                </div>
                <span
                  className={`flex-none rounded-full px-3 py-1 text-xs font-medium ${
                    c.reviewStatus
                      ? c.reviewStatus === 'valid'
                        ? 'bg-emerald-brand text-cream'
                        : 'bg-cream text-gold-deep ring-1 ring-gold/60'
                      : 'bg-red-100 text-red-800'}`}
                >
                  {reviewLabel(c)}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border-l-4 border-gold bg-cream px-4 py-3">
                  <p className="text-xs font-medium text-gold-deep">Customer comment</p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm">{c.comment || 'No comment left.'}</p>
                </div>
                <div className="rounded-xl border-l-4 border-emerald-brand bg-cream px-4 py-3">
                  <p className="text-xs font-medium text-gold-deep">Supplier response</p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm">{c.sellerResponse || 'None yet.'}</p>
                </div>
              </div>

              {c.reviewStatus && (
                <p className="mt-3 text-sm">
                  {c.reviewStatus === 'valid' && c.strikeNumber ? `Strike ${c.strikeNumber}: ${strikeLabel(c.strikeNumber)}. ` : ''}
                  {c.reviewNote ? `Note: ${c.reviewNote}` : ''}
                </p>
              )}

              <div className="mt-3">
                <StrikeMeter strikes={strikes} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!c.reviewStatus && (
                  <>
                    <button disabled={busyId === c.id} onClick={() => review(c, 'valid')} className={btnDanger}>
                      Uphold complaint
                    </button>
                    <button disabled={busyId === c.id} onClick={() => review(c, 'dismissed')} className={btnGold}>
                      Dismiss
                    </button>
                  </>
                )}
                {seller && (
                  <button
                    onClick={() => onOpenSupplier(statusOf(seller))}
                    className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
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
  const [requests, setRequests] = useState([])
  const [tab, setTab] = useState('pending')
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')

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

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'dataRequests'),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          setRequests(items)
        },
        (err) => console.error(err)
      ),
    []
  )

  if (error) {
    return (
      <p role="alert" className="mx-auto my-10 max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        {error}
      </p>
    )
  }
  if (!sellers) {
    return (
      <p role="status" className="p-10 text-center text-emerald-brand">
        Loading…
      </p>
    )
  }

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
    ['pending', 'Pending', groups.pending.length, true],
    ['approved', 'Approved', groups.approved.length, false],
    ['closed', 'Rejected / removed', groups.closed.length, false],
    ['complaints', 'Complaints to review', complaints.filter((c) => !c.reviewStatus).length, true],
    ['requests', 'Data requests', requests.filter((r) => r.status === 'open').length, true],
  ]

  const openSupplier = (status) => setTab(status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : 'closed')

  async function exportExcel() {
    setExportError('')
    const supplierRows = [...sellers]
      .sort((a, b) => (a.businessName || '').localeCompare(b.businessName || ''))
      .map((s) => ({
        supplier: s.businessName,
        city: s.city,
        status: statusOf(s),
        preferred: Boolean(s.preferred),
        complaints: counts[s.id] || 0,
        upheld: validCounts[s.id] || 0,
        agreed: s.acceptedRulesAt,
      }))
    const complaintRows = complaints.map((c) => {
      const seller = sellers.find((s) => s.id === c.sellerId)
      return {
        date: c.createdAt,
        supplier: c.sellerName || seller?.businessName,
        service: c.listingTitle,
        comment: c.comment || '',
        response: c.sellerResponse || '',
        decision: reviewLabel(c),
        strike: c.strikeNumber,
        note: c.reviewNote || '',
      }
    })
    try {
      await downloadWorkbook(`zolara-suppliers-${stampDate()}.xlsx`, [
        {
          name: 'Suppliers',
          title: 'Zolara · Suppliers',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}. Upheld counts cover the last ${STRIKE_WINDOW_DAYS} days.`,
          columns: [
            { header: 'Supplier', key: 'supplier', width: 32 },
            { header: 'City', key: 'city', width: 18 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Preferred', key: 'preferred', width: 12 },
            { header: 'Complaints', key: 'complaints', type: 'number', width: 14, total: true },
            { header: 'Upheld', key: 'upheld', type: 'number', width: 12, total: true },
            { header: 'Agreed to rules', key: 'agreed', type: 'date', width: 18 },
          ],
          rows: supplierRows,
        },
        {
          name: 'Complaints',
          title: 'Zolara · Complaints',
          subtitle: 'Every “not satisfied” feedback, newest first.',
          columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Supplier', key: 'supplier', width: 28 },
            { header: 'Service', key: 'service', width: 28 },
            { header: 'Customer comment', key: 'comment', width: 44 },
            { header: 'Supplier response', key: 'response', width: 44 },
            { header: 'Decision', key: 'decision', width: 16 },
            { header: 'Strike', key: 'strike', type: 'number', width: 10 },
            { header: 'Admin note', key: 'note', width: 36 },
          ],
          rows: complaintRows,
        },
      ])
    } catch (err) {
      console.error(err)
      setExportError('Could not build the Excel file.')
    }
  }

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Admin: suppliers</h1>
          <p className="mt-2 max-w-2xl text-sm text-cream/85 sm:text-base">
            Approving a supplier makes their listings visible to customers. Rejecting or removing hides them.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/admin/reports"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-emerald-brand transition hover:bg-gold/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-brand"
            >
              <Icon name="chart" />
              Payments and reports
            </Link>
            <button
              onClick={exportExcel}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
            >
              <Icon name="download" />
              Download suppliers and complaints (Excel)
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {exportError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {exportError}
          </p>
        )}

        <div
          className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          role="group"
          aria-label="Admin sections"
        >
          {tabs.map(([v, label, n, attention]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              aria-pressed={tab === v}
              className={`inline-flex min-h-[44px] flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                tab === v
                  ? 'bg-emerald-brand text-cream'
                  : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  attention && n > 0
                    ? 'bg-gold text-emerald-brand'
                    : tab === v
                      ? 'bg-cream/20 text-cream'
                      : 'bg-cream text-gold-deep'}`}
              >
                {n}
              </span>
            </button>
          ))}
        </div>

        {tab === 'requests' ? (
          <DataRequests requests={requests} />
        ) : tab === 'complaints' ? (
          <Complaints complaints={complaints} sellers={sellers} validCounts={validCounts} onOpenSupplier={openSupplier} />
        ) : (
          <>
            {groups[tab].length === 0 && (
              <p className="rounded-2xl border border-gold/40 bg-white p-6 text-center text-sm">Nobody here.</p>
            )}
            <ul className="flex flex-col gap-4">
              {groups[tab].map((s) => (
                <SellerCard
                  key={s.id}
                  seller={s}
                  status={statusOf(s)}
                  complaintCount={counts[s.id] || 0}
                  strikes={validCounts[s.id] || 0}
                />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}