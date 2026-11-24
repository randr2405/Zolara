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

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnGold = `${btn} border border-gold-deep text-gold-deep hover:bg-gold-deep hover:text-white`

const dateField =
  'mt-1 block min-h-[44px] w-full rounded-xl border border-gold/50 bg-white px-3 py-2 text-base text-charcoal focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold'

const STATUS_STYLE = {
  pending: 'bg-cream text-gold-deep ring-1 ring-gold/60',
  approved: 'bg-emerald-brand text-cream',
  rejected: 'bg-red-100 text-red-800',
  removed: 'bg-red-100 text-red-800',
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2">
      <p className="text-xs text-gold-deep">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gold-deep">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
    </div>
  )
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
  const [payments, setPayments] = useState([])
  const [banks, setBanks] = useState({})
  const [open, setOpen] = useState('')
  const [error, setError] = useState('')

  const fail = (label) => (err) => { console.error(err); setError(`Could not load ${label}.`) }

  useEffect(() => onSnapshot(collection(db, 'sellers'),
    (s) => setSellers(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('suppliers')), [])
  useEffect(() => onSnapshot(query(collection(db, 'orders'), where('status', '==', 'delivered')),
    (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => o.paymentStatus === 'paid')),
    fail('orders')), [])
  useEffect(() => onSnapshot(query(collection(db, 'bookings'), where('status', '==', 'completed')),
    (s) => setBookings(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.paymentStatus === 'paid')),
    fail('bookings')), [])
  useEffect(() => onSnapshot(collection(db, 'ledger'),
    (s) => setLedger(s.docs.map((d) => ({ id: d.id, ...d.data() }))), fail('the ledger')), [])
  useEffect(() => onSnapshot(collection(db, 'payments'),
    (s) => setPayments(
      s.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    ), fail('payments')), [])
  useEffect(() => onSnapshot(collection(db, 'payoutDetails'),
    (s) => {
      const map = {}
      s.docs.forEach((d) => { map[d.id] = d.data() })
      setBanks(map)
    }, fail('banking details')), [])

  const rows = useMemo(() => {
    if (!sellers) return []
    const sales = [
      ...orders.map((o) => ({
        sellerId: o.sellerId, cents: o.totalCents || 0, fee: o.feeCents || 0, at: millis(o.updatedAt || o.createdAt),
      })),
      ...bookings.map((b) => ({
        sellerId: b.sellerId, cents: b.priceCents || 0, fee: b.feeCents || 0, at: millis(b.updatedAt || b.createdAt),
      })),
    ]
    const lo = startOfDay(from)
    const hi = endOfDay(to)
    return sellers
      .map((s) => {
        const mine = sales.filter((x) => x.sellerId === s.id)
        const entries = ledger.filter((l) => l.sellerId === s.id)
        const earned = sum(mine, (x) => x.cents)
        const fees = sum(mine, (x) => x.fee)
        const periodSales = sum(mine.filter((x) => x.at >= lo && x.at <= hi), (x) => x.cents)
        const subscriptions = sum(entries.filter((l) => l.type === 'subscription'), (l) => l.effectCents)
        const paid = sum(entries.filter((l) => l.type === 'payout'), (l) => l.effectCents)
        const adjustments = sum(entries.filter((l) => l.type === 'adjustment'), (l) => l.effectCents)
        return {
          seller: s, status: statusOf(s), earned, fees, periodSales, subscriptions, paid, adjustments,
          balance: earned - fees + subscriptions + paid + adjustments, entries,
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
    const header = ['Supplier', 'Status', 'Sales in period', 'Sales all time', 'PayFast fees', 'Subscriptions', 'Paid out', 'Adjustments', 'Balance owed']
    const lines = rows.map((r) => [
      r.seller.businessName, r.status, r.periodSales / 100, r.earned / 100, -r.fees / 100,
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
    const period = `Period ${from} to ${to}. Sales count when a booking is completed or an order is delivered, and the customer has paid.`
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
            { measure: 'PayFast fees deducted', amount: -sum(rows, (r) => r.fees) },
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
            { header: 'PayFast fees', key: 'fees', type: 'cents', width: 18, total: true },
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
            fees: -r.fees,
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

  if (!sellers) {
    return (
      <p role="status" className="p-10 text-center text-emerald-brand">
        {error || 'Loading…'}
      </p>
    )
  }

  const totals = {
    period: sum(rows, (r) => r.periodSales),
    fees: sum(rows, (r) => r.fees),
    subs: sum(rows, (r) => r.subscriptions),
    paid: sum(rows, (r) => r.paid),
    balance: sum(rows, (r) => r.balance),
  }
  const attention = payments.filter((p) => p.needsAttention)
  const periodPayments = payments.filter((p) => {
    const t = millis(p.paidAt || p.createdAt)
    return p.status !== 'pending' && t >= startOfDay(from) && t <= endOfDay(to)
  })

  const summary = [
    ['Sales in period', formatZAR(totals.period)],
    ['PayFast fees', formatZAR(-totals.fees)],
    ['Subscriptions charged', formatZAR(-totals.subs)],
    ['Paid out', formatZAR(-totals.paid)],
  ]

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Payments and reports</h1>
            <p className="mt-2 text-sm text-cream/85 sm:text-base">
              {from} to {to}
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex min-h-[44px] items-center rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            Back to suppliers
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className="mb-6 rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <label className="block text-sm font-medium text-emerald-brand">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateField} />
            </label>
            <label className="block text-sm font-medium text-emerald-brand">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateField} />
            </label>
            <div className="flex items-end">
              <button
                onClick={() => { setFrom(toInputDate(initial.start)); setTo(toInputDate(initial.end)) }}
                className={`${btnGold} w-full lg:w-auto`}
              >
                Current fortnight
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-gold/30 pt-4">
            <button onClick={exportExcel} className={btnPrimary}>Export Excel</button>
            <button onClick={exportCsv} className={btnGold}>Export CSV</button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm">
              <p className="text-xs text-gold-deep">{label}</p>
              <p className="mt-1 font-display text-xl font-semibold text-emerald-brand">{value}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border-b-4 border-gold bg-emerald-brand p-4 text-cream shadow-sm lg:col-span-1">
            <p className="text-xs text-cream/80">Total owed to suppliers</p>
            <p className="mt-1 font-display text-xl font-semibold">{formatZAR(totals.balance)}</p>
          </div>
        </div>

        <h2 className="mb-3 font-display text-2xl font-semibold text-emerald-brand">Suppliers</h2>
        {rows.length === 0 && (
          <p className="rounded-2xl border border-gold/40 bg-white p-6 text-center text-sm">No suppliers yet.</p>
        )}

        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const bank = banks[r.seller.id]
            const changedRecently = bank?.updatedAt && Date.now() - millis(bank.updatedAt) < 7 * 24 * 60 * 60 * 1000
            const isOpen = open === r.seller.id
            return (
              <li key={r.seller.id} className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-emerald-brand">{r.seller.businessName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}>
                        {r.status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                          bank ? 'bg-cream text-emerald-brand ring-1 ring-gold/60' : 'bg-red-100 text-red-800'}`}
                      >
                        {bank ? 'Banking details on file' : 'No banking details yet'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gold-deep">Balance owed</p>
                    <p className="font-display text-2xl font-semibold text-emerald-brand">{formatZAR(r.balance)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Metric label="Period sales" value={formatZAR(r.periodSales)} />
                  <Metric label="All sales" value={formatZAR(r.earned)} />
                  <Metric label="PayFast fees" value={formatZAR(-r.fees)} />
                  <Metric label="Subscriptions" value={formatZAR(r.subscriptions)} />
                  <Metric label="Paid out" value={formatZAR(r.paid)} />
                  <Metric label="Adjustments" value={formatZAR(r.adjustments)} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button onClick={() => recordPayout(r)} className={btnPrimary}>Record payout</button>
                  <button onClick={() => chargeSubscription(r)} className={btnGold}>Charge subscription</button>
                  <button onClick={() => addAdjustment(r)} className={btnGold}>Adjust</button>
                  <button
                    onClick={() => setOpen(isOpen ? '' : r.seller.id)}
                    aria-expanded={isOpen}
                    className="inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {isOpen ? 'Hide details' : 'Banking and history'}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-gold/40 pt-4">
                    {bank ? (
                      <>
                        {changedRecently && (
                          <p role="alert" className="mb-3 rounded-xl border border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800">
                            Banking details changed on {formatDate(bank.updatedAt)}. Confirm with the supplier by phone before paying.
                          </p>
                        )}
                        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                          <Detail label="Account holder" value={bank.accountHolder} />
                          <Detail label="Bank" value={bank.bankName} />
                          <Detail label="Account type" value={bank.accountType} />
                          <Detail label="Account number" value={bank.accountNumber} />
                          <Detail label="Branch code" value={bank.branchCode} />
                        </dl>
                      </>
                    ) : (
                      <p className="rounded-xl bg-cream px-4 py-3 text-sm">This supplier has not added banking details.</p>
                    )}
                    {r.entries.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                        {[...r.entries].sort((a, b) => millis(b.createdAt) - millis(a.createdAt)).map((l) => (
                          <li key={l.id} className="rounded-lg bg-cream px-3 py-2 text-xs sm:text-sm">
                            {formatDate(l.createdAt)} · {l.type} · {formatZAR(l.effectCents)}{l.note ? ` · ${l.note}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-2xl font-semibold text-emerald-brand">Payments</h2>
          {attention.length > 0 && (
            <div className="mb-4 rounded-2xl border border-red-700 bg-white p-4 sm:p-5">
              <p className="mb-2 text-sm font-semibold text-red-800">
                Needs attention: paid, but the booking or order was cancelled or removed
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {attention.map((p) => (
                  <li key={p.id} className="rounded-lg bg-red-50 px-3 py-2">
                    {formatDate(p.paidAt)} · {p.sellerName} · {p.title} · {formatZAR(p.amountCents)} ·
                    PayFast ref {p.pfPaymentId || '-'}. Refund in the PayFast dashboard, then add an Adjustment.
                  </li>
                ))}
              </ul>
            </div>
          )}
          {periodPayments.length === 0 && (
            <p className="rounded-2xl border border-gold/40 bg-white p-6 text-center text-sm">
              No payments in this period.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {periodPayments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold/40 bg-white p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {p.title} <span className="text-xs text-gold-deep">({p.kind})</span>
                  </p>
                  <p className="text-xs text-gold-deep">
                    {formatDate(p.paidAt || p.createdAt)} · {p.sellerName} · {p.status}
                    {p.needsAttention ? ' · NEEDS ATTENTION' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatZAR(p.amountCents)}</p>
                  {p.feeCents > 0 && <p className="text-xs text-gold-deep">Fee {formatZAR(p.feeCents)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 rounded-xl border-l-4 border-gold bg-white px-4 py-3 text-xs leading-relaxed sm:text-sm">
          Sales count when the customer has paid through PayFast and the booking is completed or the
          order is delivered. PayFast fees are deducted from each supplier’s balance.
        </p>
      </main>
    </div>
  )
}