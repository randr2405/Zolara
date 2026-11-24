import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import SellerProfileForm from '../components/SellerProfileForm.jsx'

const btn =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnGold = `${btn} border border-gold-deep text-gold-deep hover:bg-gold-deep hover:text-white`
const btnDanger = `${btn} border border-red-700 text-red-700 hover:bg-red-700 hover:text-white`
const btnQuiet = `${btn} border border-gold/50 text-charcoal hover:bg-cream`

const STATUS_STYLE = {
  approved: 'bg-emerald-brand text-cream',
  pending: 'bg-cream text-gold-deep ring-1 ring-gold/60',
  rejected: 'bg-red-100 text-red-800',
  removed: 'bg-red-100 text-red-800',
}

const ICONS = {
  plus: 'M12 5v14 M5 12h14',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  clock: 'M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
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

function listingState(l) {
  if (l.active && l.sellerApproved) return { label: 'Live', style: 'bg-emerald-brand text-cream' }
  if (l.active) return { label: 'Waiting for approval', style: 'bg-cream text-gold-deep ring-1 ring-gold/60' }
  return { label: 'Hidden', style: 'bg-cream text-charcoal/70 ring-1 ring-charcoal/20' }
}

function ListingRow({ listing: l }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const state = listingState(l)

  async function toggleActive() {
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'listings', l.id), { active: !l.active })
    } catch (err) {
      console.error(err)
      setError('Could not update the listing. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      const photos = await getDocs(collection(db, 'listings', l.id, 'photos'))
      await Promise.all(photos.docs.map((p) => deleteDoc(p.ref)))
      await deleteDoc(doc(db, 'listings', l.id))
    } catch (err) {
      console.error(err)
      setError('Could not delete the listing. Please try again.')
      setBusy(false)
    }
  }

  return (
    <li className="rounded-2xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        {l.thumb ? (
          <img src={l.thumb} alt="" className="h-16 w-16 flex-none rounded-xl object-cover sm:h-[72px] sm:w-[72px]" />
        ) : (
          <div
            className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-cream text-gold-deep sm:h-[72px] sm:w-[72px]"
            aria-hidden="true"
          >
            <Icon name={l.type === 'service' ? 'clock' : 'box'} size={26} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-emerald-brand">{l.title}</p>
          <p className="text-sm text-charcoal/70">
            {l.type === 'service' ? 'Service' : 'Product'} · {formatZAR(l.priceCents)}
          </p>
          <div className="mt-2">
            <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${state.style}`}>
              {state.label}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {confirmingDelete ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4" role="alertdialog" aria-label="Confirm delete">
          <p className="text-sm font-medium text-red-800">
            Delete “{l.title}”? Its photos will be removed too. This cannot be undone.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button disabled={busy} onClick={remove} className={`${btnDanger} w-full bg-white sm:w-auto`}>
              {busy ? 'Deleting…' : 'Yes, delete listing'}
            </button>
            <button disabled={busy} onClick={() => setConfirmingDelete(false)} className={`${btnQuiet} w-full bg-white sm:w-auto`}>
              Keep listing
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <Link to={`/seller/listings/${l.id}/edit`} className={`${btnPrimary} px-3 sm:px-5`}>
            Edit
          </Link>
          <button disabled={busy} onClick={toggleActive} className={`${btnGold} px-3 sm:px-5`}>
            {l.active ? 'Hide' : 'Show'}
          </button>
          <button disabled={busy} onClick={() => setConfirmingDelete(true)} className={`${btnDanger} px-3 sm:px-5`}>
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

function Skeleton() {
  return (
    <div className="bg-cream" role="status" aria-label="Loading dashboard">
      <div className="animate-pulse border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-cream/20" />
          <div className="flex-1">
            <div className="h-6 w-1/2 rounded bg-cream/20" />
            <div className="mt-2 h-4 w-1/3 rounded bg-cream/20" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl animate-pulse px-5 pt-6 sm:px-8">
        {[0, 1].map((i) => (
          <div key={i} className="mb-4 rounded-2xl border border-gold/30 bg-white p-5">
            <div className="flex gap-4">
              <div className="h-[72px] w-[72px] rounded-xl bg-cream" />
              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-cream" />
                <div className="mt-2 h-3 w-1/3 rounded bg-cream" />
              </div>
            </div>
            <div className="mt-4 h-11 rounded-full bg-cream" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SellerDashboard() {
  const { user } = useAuth()
  const [seller, setSeller] = useState(undefined)
  const [listings, setListings] = useState([])
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState('')
  const [loadError, setLoadError] = useState('')
  const [listingsError, setListingsError] = useState('')

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'sellers', user.uid),
        (s) => setSeller(s.exists() ? s.data() : null),
        (err) => {
          console.error(err)
          setLoadError('Could not load your dashboard. Please refresh and try again.')
        }
      ),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'listings'), where('sellerId', '==', user.uid)),
        (snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
          console.error(err)
          setListingsError('Could not load your listings. Please refresh and try again.')
        }
      ),
    [user.uid]
  )

  const status = seller ? seller.status || (seller.verified ? 'approved' : 'pending') : null

  useEffect(() => {
    if (status === 'rejected' || status === 'removed') {
      getDoc(doc(db, 'sellerDecisions', user.uid))
        .then((s) => setReason(s.exists() ? s.data().reason || '' : ''))
        .catch(() => setReason(''))
    }
  }, [status, user.uid])

  if (loadError) {
    return (
      <div className="bg-cream px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p role="alert" className="text-sm text-red-800">{loadError}</p>
        </div>
      </div>
    )
  }

  if (seller === undefined) return <Skeleton />

  if (seller === null) {
    return (
      <div className="bg-cream">
        <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
          <div className="mx-auto max-w-2xl">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Set up your business</h1>
            <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
              This is what customers see on your listings.
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
          <div className="rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
            <SellerProfileForm />
          </div>
        </main>
      </div>
    )
  }

  const statusLabel = {
    approved: 'Approved supplier',
    pending: 'Pending review',
    rejected: 'Not approved',
    removed: 'Removed',
  }[status]

  const initial = (seller.businessName || '?').trim().charAt(0).toUpperCase()
  const liveCount = listings.filter((l) => l.active && l.sellerApproved).length
  const waitingCount = listings.filter((l) => l.active && !l.sellerApproved).length
  const hiddenCount = listings.filter((l) => !l.active).length

  const stats = [
    ['Live', liveCount],
    ['Waiting', waitingCount],
    ['Hidden', hiddenCount],
  ]

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            {seller.logoUrl ? (
              <img src={seller.logoUrl} alt="" className="h-16 w-16 flex-none rounded-full object-cover ring-2 ring-gold sm:h-20 sm:w-20" />
            ) : (
              <div
                className="grid h-16 w-16 flex-none place-items-center rounded-full bg-cream font-display text-2xl font-semibold text-emerald-brand sm:h-20 sm:w-20 sm:text-3xl"
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-2xl font-semibold leading-tight sm:text-4xl">
                {seller.businessName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {seller.city && <span className="text-sm text-cream/85">{seller.city}</span>}
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button
              onClick={() => setEditing(!editing)}
              aria-expanded={editing}
              className="inline-flex min-h-[44px] items-center rounded-full border border-cream/60 px-5 py-2 text-sm font-medium text-cream transition hover:bg-cream hover:text-emerald-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
            >
              {editing ? 'Close profile editor' : 'Edit profile'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        {status === 'pending' && (
          <div role="status" className="mb-6 rounded-2xl border-l-4 border-gold bg-white p-4 text-sm shadow-sm sm:p-5">
            <p className="font-semibold text-gold-deep">Your application is being reviewed</p>
            <p className="mt-1 text-charcoal/80">
              You can set up your listings now, but customers will not see them until you are approved. We may
              contact you for a copy of your ID and proof of address.
            </p>
          </div>
        )}
        {(status === 'rejected' || status === 'removed') && (
          <div role="alert" className="mb-6 rounded-2xl border-l-4 border-red-700 bg-white p-4 text-sm shadow-sm sm:p-5">
            <p className="font-semibold text-red-800">
              {status === 'rejected'
                ? 'Your application was not approved.'
                : 'Your supplier account has been removed from Zolara.'}
            </p>
            {reason && <p className="mt-1 text-charcoal/80">Reason: {reason}</p>}
            <p className="mt-1 text-charcoal/80">Your listings are hidden from customers.</p>
          </div>
        )}

        {editing && (
          <div className="mb-6 rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
            <SellerProfileForm seller={seller} onDone={() => setEditing(false)} />
          </div>
        )}

        {listingsError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listingsError}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-emerald-brand">Your listings</h2>
          <Link to="/seller/listings/new" className={`${btnPrimary} gap-2`}>
            <Icon name="plus" size={16} />
            Add listing
          </Link>
        </div>

        {listings.length > 0 && (
          <dl className="mb-5 grid grid-cols-3 gap-3">
            {stats.map(([label, n]) => (
              <div key={label} className="rounded-2xl border border-gold/40 bg-white px-3 py-3 text-center shadow-sm">
                <dd className="font-display text-2xl font-semibold text-emerald-brand">{n}</dd>
                <dt className="text-xs font-medium text-gold-deep">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-gold/40 bg-white p-8 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-emerald-brand">No listings yet</p>
            <p className="mt-2 text-sm text-charcoal/70">Add your first product or service to get started.</p>
            <Link to="/seller/listings/new" className={`${btnPrimary} mt-5 gap-2`}>
              <Icon name="plus" size={16} />
              Add your first listing
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {listings.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}