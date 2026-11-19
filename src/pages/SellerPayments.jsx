import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import { LEDGER_LABEL, formatDate, millis, sum } from '../lib/finance.js'
import { downloadWorkbook, stampDate } from '../lib/reportExport.js'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

const BANKS = [
  'ABSA', 'African Bank', 'Capitec', 'Discovery Bank', 'FNB', 'Investec',
  'Nedbank', 'Standard Bank', 'TymeBank', 'Other',
]

function BankDetails({ uid }) {
  const [saved, setSaved] = useState(undefined)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    accountHolder: '', bankName: '', accountNumber: '', branchCode: '', accountType: 'Cheque / Current',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    getDoc(doc(db, 'payoutDetails', uid))
      .then((s) => {
        if (s.exists()) {
          setSaved(s.data())
          setForm((f) => ({ ...f, ...s.data() }))
        } else {
          setSaved(null)
          setEditing(true)
        }
      })
      .catch(() => setSaved(null))
  }, [uid])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!/^\d{6,16}$/.test(form.accountNumber.replace(/\s/g, ''))) {
      return setError('Account number should be digits only (6 to 16 digits).')
    }
    if (!/^\d{6}$/.test(form.branchCode.replace(/\s/g, ''))) {
      return setError('Branch code should be 6 digits.')
    }
    setBusy(true)
    setError('')
    try {
      const data = {
        accountHolder: form.accountHolder.trim(),
        bankName: form.bankName,
        accountNumber: form.accountNumber.replace(/\s/g, ''),
        branchCode: form.branchCode.replace(/\s/g, ''),
        accountType: form.accountType,
        updatedAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'payoutDetails', uid), data)
      setSaved({ ...data, updatedAt: null })
      setEditing(false)
    } catch (err) {
      console.error(err)
      setError('Could not save your banking details. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (saved === undefined) return <p className="text-sm">Loading…</p>

  if (!editing && saved) {
    return (
      <div className="text-sm">
        <p>{saved.accountHolder}</p>
        <p>{saved.bankName} · {saved.accountType}</p>
        <p>Account ending {saved.accountNumber.slice(-4)} · Branch {saved.branchCode}</p>
        <button onClick={() => setEditing(true)} className="mt-3 text-emerald-brand underline">
          Change banking details
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="rounded-lg bg-cream p-3 text-xs">
        We pay your earnings into this account every two weeks. Please check the details carefully.
        Only you and the Zolara team can see them. If you change them, we may contact you to confirm
        the change before your next payout.
      </p>
      <input required placeholder="Account holder name" value={form.accountHolder}
        onChange={set('accountHolder')} className={input} />
      <select required value={form.bankName} onChange={set('bankName')} className={input}>
        <option value="">Choose your bank</option>
        {BANKS.map((b) => <option key={b}>{b}</option>)}
      </select>
      <input required inputMode="numeric" placeholder="Account number" value={form.accountNumber}
        onChange={set('accountNumber')} className={input} />
      <input required inputMode="numeric" placeholder="Branch code (6 digits)" value={form.branchCode}
        onChange={set('branchCode')} className={input} />
      <select value={form.accountType} onChange={set('accountType')} className={input}>
        <option>Cheque / Current</option>
        <option>Savings</option>
        <option>Business</option>
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Saving…' : 'Save banking details'}
        </button>
        {saved && (
          <button type="button" onClick={() => setEditing(false)}
            className="rounded-full border border-gold-deep px-6 py-3 text-gold-deep">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function SellerPayments() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [ledger, setLedger] = useState([])
  const [error, setError] = useState('')

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'orders'), where('sellerId', '==', user.uid)), (snap) =>
        setOrders(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => o.status === 'delivered' && o.paymentStatus === 'paid')
        )
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'bookings'), where('sellerId', '==', user.uid)), (snap) =>
        setBookings(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((b) => b.status === 'completed' && b.paymentStatus === 'paid')
        )
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'ledger'), where('sellerId', '==', user.uid)), (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
        setLedger(items)
      }),
    [user.uid]
  )

  const sales = [
    ...orders.map((o) => ({
      id: o.id, title: o.listingTitle, kind: 'Order', cents: o.totalCents, fee: o.feeCents || 0, at: o.updatedAt || o.createdAt,
    })),
    ...bookings.map((b) => ({
      id: b.id, title: b.listingTitle, kind: 'Booking', cents: b.priceCents, fee: b.feeCents || 0, at: b.updatedAt || b.createdAt,
    })),
  ].sort((a, b) => millis(b.at) - millis(a.at))

  const earned = sum(sales, (s) => s.cents || 0)
  const fees = sum(sales, (s) => s.fee)
  const subscriptions = sum(ledger.filter((l) => l.type === 'subscription'), (l) => l.effectCents)
  const paid = sum(ledger.filter((l) => l.type === 'payout'), (l) => l.effectCents)
  const adjustments = sum(ledger.filter((l) => l.type === 'adjustment'), (l) => l.effectCents)
  const balance = earned - fees + subscriptions + paid + adjustments

  async function download() {
    setError('')
    try {
      await downloadWorkbook(`zolara-statement-${stampDate()}.xlsx`, [
        {
          name: 'Summary',
          title: 'Zolara · Supplier statement',
          subtitle: `Generated ${new Date().toLocaleDateString('en-ZA')}. A sale counts once it is paid and the booking is completed or the order is delivered.`,
          columns: [
            { header: 'Measure', key: 'measure', width: 30 },
            { header: 'Amount', key: 'amount', type: 'cents', width: 22 },
          ],
          rows: [
            { measure: 'Sales completed', amount: earned },
            { measure: 'PayFast fees', amount: -fees },
            { measure: 'Subscription', amount: subscriptions },
            { measure: 'Paid to you', amount: paid },
            { measure: 'Adjustments', amount: adjustments },
            { measure: 'Balance owed to you', amount: balance },
          ],
        },
        {
          name: 'Statement',
          title: 'Zolara · Payouts and charges',
          subtitle: 'Negative amounts reduce your balance.',
          columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Amount', key: 'amount', type: 'cents', width: 18, total: true },
            { header: 'Note', key: 'note', width: 44 },
          ],
          rows: ledger.map((l) => ({
            date: l.createdAt,
            type: LEDGER_LABEL[l.type] || l.type,
            amount: l.effectCents,
            note: l.note || '',
          })),
        },
        {
          name: 'Completed sales',
          title: 'Zolara · Completed sales',
          subtitle: 'Paid bookings marked completed and paid orders marked delivered.',
          columns: [
            { header: 'Date', key: 'date', type: 'datetime', width: 20 },
            { header: 'Item', key: 'item', width: 34 },
            { header: 'Type', key: 'kind', width: 14 },
            { header: 'Amount', key: 'amount', type: 'cents', width: 18, total: true },
            { header: 'PayFast fee', key: 'fee', type: 'cents', width: 16, total: true },
            { header: 'You receive', key: 'net', type: 'cents', width: 18, total: true },
          ],
          rows: sales.map((s) => ({
            date: s.at,
            item: s.title,
            kind: s.kind,
            amount: s.cents,
            fee: -s.fee,
            net: (s.cents || 0) - s.fee,
          })),
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Could not build the Excel file.')
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-emerald-brand">Payments</h1>
        <div className="flex items-center gap-4">
          <button onClick={download}
            className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep">
            Download statement (Excel)
          </button>
          <Link to="/seller" className="text-sm text-emerald-brand underline">Back to dashboard</Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ['Sales completed', formatZAR(earned)],
          ['PayFast fees', formatZAR(-fees)],
          ['Subscription', formatZAR(subscriptions)],
          ['Paid to you', formatZAR(paid)],
          ['Balance owed to you', formatZAR(balance)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4">
            <p className="text-xs text-gold-deep">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {adjustments !== 0 && (
        <p className="mb-6 text-xs">Adjustments of {formatZAR(adjustments)} are included in your balance.</p>
      )}
      <p className="mb-8 text-xs">
        A sale counts once the customer has paid through PayFast and the booking is marked completed
        or the order is marked delivered. Zolara pays your balance every two weeks, after PayFast’s
        fee on each sale and the R250 monthly subscription are deducted.
      </p>

      <section className="mb-8 rounded-xl bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-emerald-brand">Banking details</h2>
        <BankDetails uid={user.uid} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-emerald-brand">Statement</h2>
        {ledger.length === 0 && <p className="text-sm">No payouts or charges yet.</p>}
        <ul className="flex flex-col gap-2">
          {ledger.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{LEDGER_LABEL[l.type] || l.type}</p>
                <p className="text-xs text-gold-deep">{formatDate(l.createdAt)}{l.note ? ` · ${l.note}` : ''}</p>
              </div>
              <p className={l.effectCents < 0 ? 'text-red-700' : 'text-emerald-brand'}>
                {formatZAR(l.effectCents)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-emerald-brand">Completed sales</h2>
        {sales.length === 0 && <p className="text-sm">No completed sales yet.</p>}
        <ul className="flex flex-col gap-2">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-gold-deep">{formatDate(s.at)}</p>
              </div>
              <div className="text-right">
                <p>{formatZAR(s.cents)}</p>
                {s.fee > 0 && <p className="text-xs text-gold-deep">PayFast fee {formatZAR(-s.fee)}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}