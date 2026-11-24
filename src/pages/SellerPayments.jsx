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

const btn =
  'inline-flex min-h-[48px] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnQuiet = `${btn} border border-gold-deep text-gold-deep hover:bg-cream`

const inputClass =
  'min-h-[48px] w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold'

const BANKS = [
  'ABSA', 'African Bank', 'Capitec', 'Discovery Bank', 'FNB', 'Investec',
  'Nedbank', 'Standard Bank', 'TymeBank', 'Other',
]

const ICONS = {
  chevron: 'M6 9l6 6 6-6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  back: 'M15 6l-6 6 6 6',
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

function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-emerald-brand">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-charcoal/70">{hint}</p>}
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gold-deep">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
    </div>
  )
}

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

  if (saved === undefined) {
    return (
      <div className="animate-pulse" role="status" aria-label="Loading banking details">
        <div className="h-4 w-1/2 rounded bg-cream" />
        <div className="mt-2 h-4 w-2/3 rounded bg-cream" />
        <div className="mt-2 h-4 w-1/3 rounded bg-cream" />
      </div>
    )
  }

  if (!editing && saved) {
    return (
      <div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailRow label="Account holder" value={saved.accountHolder} />
          <DetailRow label="Bank" value={saved.bankName} />
          <DetailRow label="Account type" value={saved.accountType} />
          <DetailRow label="Account number" value={`Ending ${String(saved.accountNumber).slice(-4)}`} />
          <DetailRow label="Branch code" value={saved.branchCode} />
        </dl>
        <button onClick={() => setEditing(true)} className={`${btnQuiet} mt-5 w-full sm:w-auto`}>
          Change banking details
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="rounded-xl border-l-4 border-gold bg-cream px-4 py-3 text-sm text-charcoal/80">
        We pay your earnings into this account every two weeks. Please check the details carefully.
        Only you and the Zolara team can see them. If you change them, we may contact you to confirm
        the change before your next payout.
      </p>
      <Field label="Account holder name" htmlFor="bk-holder">
        <input
          id="bk-holder"
          required
          autoComplete="off"
          placeholder="Name on the account"
          value={form.accountHolder}
          onChange={set('accountHolder')}
          className={inputClass}
        />
      </Field>
      <Field label="Bank" htmlFor="bk-bank">
        <select id="bk-bank" required value={form.bankName} onChange={set('bankName')} className={inputClass}>
          <option value="">Choose your bank</option>
          {BANKS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account number" htmlFor="bk-account" hint="Digits only, 6 to 16 digits.">
          <input
            id="bk-account"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="Account number"
            value={form.accountNumber}
            onChange={set('accountNumber')}
            className={inputClass}
          />
        </Field>
        <Field label="Branch code" htmlFor="bk-branch" hint="6 digits.">
          <input
            id="bk-branch"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={7}
            placeholder="Branch code"
            value={form.branchCode}
            onChange={set('branchCode')}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Account type" htmlFor="bk-type">
        <select id="bk-type" value={form.accountType} onChange={set('accountType')} className={inputClass}>
          <option>Cheque / Current</option>
          <option>Savings</option>
          <option>Business</option>
        </select>
      </Field>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {saved && (
          <button type="button" onClick={() => setEditing(false)} className={`${btnQuiet} w-full sm:w-auto`}>
            Cancel
          </button>
        )}
        <button disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
          {busy ? 'Saving…' : 'Save banking details'}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6 rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-semibold text-emerald-brand">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading payments">
      <div className="h-32 rounded-2xl bg-emerald-brand/30" />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white" />)}
      </div>
    </div>
  )
}

export default function SellerPayments() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [ledger, setLedger] = useState([])
  const [loaded, setLoaded] = useState({ orders: false, bookings: false, ledger: false })
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null)
  const [showHow, setShowHow] = useState(false)

  const markLoaded = (key) => setLoaded((l) => ({ ...l, [key]: true }))
  const fail = (key) => (err) => {
    console.error(err)
    setError('Could not load all of your payment information. Please refresh and try again.')
    markLoaded(key)
  }

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'orders'), where('sellerId', '==', user.uid)),
        (snap) => {
          setOrders(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((o) => o.status === 'delivered' && o.paymentStatus === 'paid')
          )
          markLoaded('orders')
        },
        fail('orders')
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'bookings'), where('sellerId', '==', user.uid)),
        (snap) => {
          setBookings(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((b) => b.status === 'completed' && b.paymentStatus === 'paid')
          )
          markLoaded('bookings')
        },
        fail('bookings')
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'ledger'), where('sellerId', '==', user.uid)),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          items.sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
          setLedger(items)
          markLoaded('ledger')
        },
        fail('ledger')
      ),
    [user.uid]
  )

  const ready = loaded.orders && loaded.bookings && loaded.ledger

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

  const stats = [
    ['Sales completed', formatZAR(earned)],
    ['PayFast fees', formatZAR(-fees)],
    ['Subscription', formatZAR(subscriptions)],
    ['Paid to you', formatZAR(paid)],
  ]

  const tabs = [
    ['statement', 'Statement', ledger.length],
    ['sales', 'Completed sales', sales.length],
  ]
  const activeTab = tab || (ledger.length > 0 ? 'statement' : 'sales')

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/seller"
            className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-cream/85 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <Icon name="back" />
            Back to dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Payments</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Your balance, banking details, payouts and completed sales.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={download}
              disabled={!ready}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream disabled:opacity-60"
            >
              <Icon name="download" />
              Download statement (Excel)
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {!ready ? (
          <div className="mb-6"><Skeleton /></div>
        ) : (
          <>
            <div className="rounded-2xl border-b-4 border-gold bg-emerald-brand p-5 text-cream shadow-sm sm:p-6">
              <p className="text-sm font-medium text-cream/85">Balance owed to you</p>
              <p className="mt-1 font-display text-4xl font-semibold text-gold sm:text-5xl">{formatZAR(balance)}</p>
              <p className="mt-2 text-xs text-cream/80">Zolara pays your balance every two weeks.</p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-medium text-gold-deep">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-emerald-brand">{value}</dd>
                </div>
              ))}
            </dl>

            {adjustments !== 0 && (
              <p className="mt-3 text-xs text-charcoal/70">
                Adjustments of {formatZAR(adjustments)} are included in your balance.
              </p>
            )}

            <div className="mb-6 mt-3">
              <button
                onClick={() => setShowHow(!showHow)}
                aria-expanded={showHow}
                className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-emerald-brand underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                How payments work
                <span className={`transition ${showHow ? 'rotate-180' : ''}`}>
                  <Icon name="chevron" />
                </span>
              </button>
              {showHow && (
                <p className="mt-2 rounded-xl border-l-4 border-gold bg-white px-4 py-3 text-sm text-charcoal/80 shadow-sm">
                  A sale counts once the customer has paid through PayFast and the booking is marked completed
                  or the order is marked delivered. Zolara pays your balance every two weeks, after PayFast’s
                  fee on each sale and the R250 monthly subscription are deducted.
                </p>
              )}
            </div>
          </>
        )}

        <Section title="Banking details">
          <BankDetails uid={user.uid} />
        </Section>

        <div
          className="mb-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0"
          role="group"
          aria-label="Payment history"
        >
          {tabs.map(([v, label, n]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              aria-pressed={activeTab === v}
              className={`inline-flex min-h-[44px] flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                activeTab === v
                  ? 'bg-emerald-brand text-cream'
                  : 'border border-gold-deep bg-white text-gold-deep hover:bg-cream'}`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeTab === v ? 'bg-cream/20 text-cream' : 'bg-cream text-gold-deep'}`}
              >
                {n}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'statement' ? (
          ledger.length === 0 ? (
            <div className="rounded-2xl border border-gold/40 bg-white p-6 text-center shadow-sm">
              <p className="text-sm">No payouts or charges yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {ledger.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-emerald-brand">{LEDGER_LABEL[l.type] || l.type}</p>
                    <p className="break-words text-xs text-gold-deep">
                      {formatDate(l.createdAt)}{l.note ? ` · ${l.note}` : ''}
                    </p>
                  </div>
                  <p className={`flex-none text-sm font-semibold ${l.effectCents < 0 ? 'text-red-700' : 'text-emerald-brand'}`}>
                    {formatZAR(l.effectCents)}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : sales.length === 0 ? (
          <div className="rounded-2xl border border-gold/40 bg-white p-6 text-center shadow-sm">
            <p className="text-sm">No completed sales yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sales.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-gold/40 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold text-emerald-brand">{s.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-gold-deep ring-1 ring-gold/60">
                      {s.kind}
                    </span>
                    <span className="text-xs text-gold-deep">{formatDate(s.at)}</span>
                  </div>
                </div>
                <div className="flex-none text-right">
                  <p className="text-sm font-semibold text-emerald-brand">{formatZAR(s.cents)}</p>
                  {s.fee > 0 && (
                    <>
                      <p className="text-xs text-gold-deep">PayFast fee {formatZAR(-s.fee)}</p>
                      <p className="text-xs text-charcoal/70">You receive {formatZAR((s.cents || 0) - s.fee)}</p>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}