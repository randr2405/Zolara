import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import {
  SUBSCRIPTION_CENTS, endOfDay, fortnightFor, formatDate, millis, startOfDay, sum, toInputDate,
} from '../lib/finance.js'
import { downloadWorkbook } from '../lib/reportExport.js'

const statusOf = (s) => s.status || (s.verified ? 'approved' : 'pending')

const ENTRY_LABEL = {
  subscription: 'Subscription',
  payout: 'Payout',
  adjustment: 'Adjustment',
}

export default function AdminReports() {
  const { user } = useAuth()
  const initial = fortnightFor()
  const [from, setFrom] = useState(toInputDate(initial.start))
  const [to, setTo] = useState(toInputDate(initial.end))
  const [sellers, setSellers] = useState(null)
  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [ledger, setLedger] = useState([])
  const [banks, setBanks] = useState({})
  const [open, setOpen] = useState('')
  const [error, setError] = useState('')

  const fail = (label) => (err) => { console.error(err); setError(`Could not load ${label}.`) }

  useEffect(() => onSnapshot(collection(db, 'sellers'),
    (s) => setSellers(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('suppliers')), [])
  useEffect(() => onSnapshot(query(collection(db, 'orders'), where('status', '==', 'delivered')),
    (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('orders')), [])
  useEffect(() => onSnapshot(query(collection(db, 'bookings'), where('status', '==', 'completed')),
    (s) => setBookings(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('bookings')), [])
  useEffect(() => onSnapshot(collection(db, 'ledger'),
    (s) => setLedger(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('the ledger')), [])
  useEffect(() => onSnapshot(collection(db, 'payoutDetails'),
    (s) => {
      const map = {}
      s.docs.forEach((d) => { map[d.id] = d.data() })
      setBanks(map)
    }, fail('banking details')), [])

  const rows = useMemo(() => {
    if (!sellers) return []
    const sales = [
      ...orders.map((o) => ({ sellerId: o.sellerId, cents: o.totalCents || 0, at: millis(o.updatedAt || o.createdAt) })),
      ...bookings.map((b) => ({ sellerId: b.sellerId, cents: b.priceCents || 0, at: millis(b.updatedAt || b.createdAt) })),
    ]
    const lo = startOfDay(from)
    const hi = endOfDay(to)
    return sellers
      .map((s) => {
        const mine = sales.filter((x) => x.sellerId === s.id)
        const entries = ledger.filter((l) => l.sellerId === s.id)
        const earned = sum(mine, (x) => x.cents)
        const periodSales = sum(mine.filter((x) => x.at >= lo && x.at <= hi), (x) => x.cents)
        const subscriptions = sum(entries.filter((l) => l.type === 'subscription'), (l) => l.effectCents)
        const paid = sum(entries.filter((l) => l.type === 'payout'), (l) => l.effectCents)
        const adjustments = sum(entries.filter((l) => l.type === 'adjustment'), (l) => l.effectCents)
        return {
          seller: s, status: statusOf(s), earned, periodSales, subscriptions, paid, adjustments,
          balance: earned + subscriptions + paid + adjustments, entries,
        }
      })
      .filter((r) => r.status === 'approved' || r.earned > 0 || r.entries.length > 0)
      .sort((a, b) => a.seller.businessName.localeCompare(b.seller.businessName))
  }, [sellers, orders, bookings, ledger, from, to])

  async function addEntry(row, type, effectCents, note) {
    setError('')
    try {
      await addDoc(collection(db, 'ledger'), {
        sellerId: row.seller.id,
        sellerName: row.seller.businessName,
        type, effectCents, note,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Could not save the entry. Check your rules and try again.')
    }
  }

  function chargeSubscription(row) {
    const month = new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    const note = `Subscription ${month}`
    if (row.entries.some((l) => l.type === 'subscription' && l.note === note)) {
      if (!window.confirm(`${row.seller.businessName} has already been charged for ${month}. Charge again?`)) return
    } else if (!window.confirm(`Charge ${row.seller.businessName} ${formatZAR(SUBSCRIPTION_CENTS)} for ${month}?`)) {
      return
    }
    addEntry(row, 'subscription', -SUBSCRIPTION_CENTS, note)
  }

  function recordPayout(row) {
    const answer = window.prompt(
      `Record a payout to ${row.seller.businessName}. Amount in rand:`,
      Math.max(row.balance, 0) / 100
    )
    if (answer === null) return
    const cents = Math.round(parseFloat(String(answer).replace(',', '.')) * 100)
    if (!cents || cents <= 0) return setError('Enter a valid amount.')
    addEntry(row, 'payout', -cents, `Payout for ${from} to ${to}`)
  }

  function addAdjustment(row) {
    const answer = window.prompt('Adjustment in rand. Use a minus sign to reduce what you owe them (e.g. a refund: -150):')
    if (answer === null) return
    const cents = Math.round(parseFloat(String(answer).replace(',', '.')) * 100)
    if (!cents) return setError('Enter a valid amount.')
    const note = window.prompt('Reason for the adjustment:')
    if (!note) return
    addEntry(row, 'adjustment', cents, note)
  }

  function exportCsv() {
    const header = ['Supplier', 'Status', 'Sales in period', 'Sales all time', 'Subscriptions', 'Paid out', 'Adjustments', 'Balance owed']
    const lines = rows.map((r) => [
      r.seller.businessName, r.status, r.periodSales / 100, r.earned / 100,
      r.subscriptions / 100, r.paid / 100, r.adjustments / 100, r.balance / 100,
    ])
    const csv = [header, ...lines]
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `zolara-report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportExcel() {
    setError('')
    const period = `Period ${from} to ${to}. Sales count when a booking is completed or an order is delivered.`
    const entries = rows
      .flatMap((r) => r.entries)
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
      .map((l) => ({
        date: l.createdAt,
        supplier: l.sellerName,
        type: ENTRY_LABEL[l.type] || l.type,
        amount: l.effectCents,
        note: l.note || '',
      }))
    try {
      await downloadWorkbook(`zolara-report-${from}-to-${to}.xlsx`, [
        {
          name: 'Summary',
          title: 'Zolara · Supplier payments summary',
          subtitle: period,
          columns: [
            { header: 'Measure', key: 'measure', width: 32 },
            { header: 'Amount', key: 'amount', type: 'cents', width: 22 },
          ],
          rows: [
            { measure: 'Sales in period', amount: sum(rows, (r) => r.periodSales) },
            { measure: 'Subscriptions charged', amount: -sum(rows, (r) => r.subscriptions) },
            { measure: 'Paid out', amount: -sum(rows, (r) => r.paid) },
            { measure: 'Total owed to suppliers', amount: sum(rows, (r) => r.balance) },
          ],
        },
        {
          name: 'Suppliers',
          title: 'Zolara · Supplier balances',
          subtitle: period,
          columns: [
            { header: 'Supplier', key: 'supplier', width: 32 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Banking details', key: 'banking', width: 16 },
            { header: 'Sales in period', key: 'periodSales', type: 'cents', width: 18, total: true },
            { header: 'Sales all time', key: 'earned', type: 'cents', width: 18, total: true },
            { header: 'Subscriptions', key: 'subscriptions', type: 'cents', width: 18, total: true },
            { header: 'Paid out', key: 'paid', type: 'cents', width: 18, total: true },
            { header: 'Adjustments', key: 'adjustments', type: 'cents', width: 18, total: true },
            { header: 'Balance owed', key: 'balance', type: 'cents', width: 18, total: true },
          ],
          rows: rows.map((r) => ({
            supplier: r.seller.businessName,
            status: r.status,
            banking: banks[r.seller.id] ? 'On file' : 'Missing',
            periodSales: r.periodSales,
            earned: r.earned,
            subscriptions: r.subscriptions,
            paid: r.paid,
            adjustments: r.adjustments,
            balance: r.balance,
          })),
        },
        {
          name: 'Ledger',
          title: 'Zolara · Ledger entries',
          subtitle: 'Subscriptions, payouts and adjustments for the suppliers listed. Negative amounts reduce what is owed.',
          columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Supplier', key: 'supplier', width: 32 },
            { header: 'Type', key: 'type', width: 16 },
            { header: 'Amount', key: 'amount', type: 'cents', width: 18 },
            { header: 'Note', key: 'note', width: 44 },
          ],
          rows: entries,
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Could not build the Excel file.')
    }
  }

  if (!sellers) return <p className="p-6 text-center">{error || 'Loading…'}</p>

  const totals = {
    period: sum(rows, (r) => r.periodSales),
    subs: sum(rows, (r) => r.subscriptions),
    paid: sum(rows, (r) => r.paid),
    balance: sum(rows, (r) => r.balance),
  }
  const input = 'rounded-lg border border-gold/50 bg-white p-2 text-sm'

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-brand">Payments and reports</h1>
        <Link to="/admin" className="text-sm text-emerald-brand underline">Back to suppliers</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block`} /></label>
        <label className="text-xs">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block`} /></label>
        <button onClick={() => { setFrom(toInputDate(initial.start)); setTo(toInputDate(initial.end)) }}
          className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep">Current fortnight</button>
        <button onClick={exportExcel} className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream">Export Excel</button>
        <button onClick={exportCsv} className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep">Export CSV</button>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Sales in period', formatZAR(totals.period)],
          ['Subscriptions charged', formatZAR(-totals.subs)],
          ['Paid out', formatZAR(-totals.paid)],
          ['Total owed to suppliers', formatZAR(totals.balance)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4">
            <p className="text-xs text-gold-deep">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 && <p className="text-sm">No suppliers yet.</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const bank = banks[r.seller.id]
          const changedRecently = bank?.updatedAt && Date.now() - millis(bank.updatedAt) < 7 * 24 * 60 * 60 * 1000
          return (
            <li key={r.seller.id} className="rounded-xl bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{r.seller.businessName}</p>
                  <p className="text-xs">{r.status} · {bank ? 'Banking details on file' : 'No banking details yet'}</p>
                </div>
                <p className="text-lg font-semibold text-emerald-brand">{formatZAR(r.balance)}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
                <p>Period sales<br /><span className="text-sm">{formatZAR(r.periodSales)}</span></p>
                <p>All sales<br /><span className="text-sm">{formatZAR(r.earned)}</span></p>
                <p>Subscriptions<br /><span className="text-sm">{formatZAR(r.subscriptions)}</span></p>
                <p>Paid out<br /><span className="text-sm">{formatZAR(r.paid)}</span></p>
                <p>Adjustments<br /><span className="text-sm">{formatZAR(r.adjustments)}</span></p>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <button onClick={() => recordPayout(r)} className="rounded-full bg-emerald-brand px-4 py-2 text-cream">Record payout</button>
                <button onClick={() => chargeSubscription(r)} className="rounded-full border border-gold-deep px-4 py-2 text-gold-deep">Charge subscription</button>
                <button onClick={() => addAdjustment(r)} className="rounded-full border border-gold-deep px-4 py-2 text-gold-deep">Adjust</button>
                <button onClick={() => setOpen(open === r.seller.id ? '' : r.seller.id)} className="text-emerald-brand underline">
                  {open === r.seller.id ? 'Hide details' : 'Banking and history'}
                </button>
              </div>

              {open === r.seller.id && (
                <div className="mt-3 border-t border-gold/40 pt-3 text-sm">
                  {bank ? (
                    <>
                      {changedRecently && (
                        <p className="mb-2 rounded-lg border border-red-700 p-2 text-xs text-red-700">
                          Banking details changed on {formatDate(bank.updatedAt)}. Confirm with the supplier by phone before paying.
                        </p>
                      )}
                      <p>{bank.accountHolder}</p>
                      <p>{bank.bankName} · {bank.accountType}</p>
                      <p>Account {bank.accountNumber} · Branch {bank.branchCode}</p>
                    </>
                  ) : (
                    <p>This supplier has not added banking details.</p>
                  )}
                  <ul className="mt-3 flex flex-col gap-1 text-xs">
                    {[...r.entries].sort((a, b) => millis(b.createdAt) - millis(a.createdAt)).map((l) => (
                      <li key={l.id}>{formatDate(l.createdAt)} · {l.type} · {formatZAR(l.effectCents)}{l.note ? ` · ${l.note}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-xs">
        Sales count when a booking is completed or an order is delivered. Online payments are not
        connected yet, so these figures show what suppliers have earned, not money Zolara has received.
      </p>
    </main>
  )
}