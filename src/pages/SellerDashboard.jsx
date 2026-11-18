import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { formatZAR } from '../lib/constants.js'
import SellerProfileForm from '../components/SellerProfileForm.jsx'

export default function SellerDashboard() {
  const { user } = useAuth()
  const [seller, setSeller] = useState(undefined)
  const [listings, setListings] = useState([])
  const [editing, setEditing] = useState(false)

  useEffect(
    () => onSnapshot(doc(db, 'sellers', user.uid), (s) => setSeller(s.exists() ? s.data() : null)),
    [user.uid]
  )

  useEffect(
    () =>
      onSnapshot(query(collection(db, 'listings'), where('sellerId', '==', user.uid)), (snap) =>
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    [user.uid]
  )

  async function deleteListing(id) {
    if (!window.confirm('Delete this listing?')) return
    const photos = await getDocs(collection(db, 'listings', id, 'photos'))
    await Promise.all(photos.docs.map((p) => deleteDoc(p.ref)))
    await deleteDoc(doc(db, 'listings', id))
  }

  if (seller === undefined) return <p className="p-6 text-center">Loading…</p>

  if (seller === null) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="mb-1 text-2xl font-semibold text-emerald-brand">Set up your business</h1>
        <p className="mb-6 text-sm">This is what customers see on your listings.</p>
        <SellerProfileForm />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-4">
        {seller.logoUrl && <img src={seller.logoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-emerald-brand">{seller.businessName}</h1>
          <p className="text-sm">{seller.city} · {seller.verified ? 'Verified' : 'Pending verification'}</p>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-sm text-gold-deep underline">
          {editing ? 'Close' : 'Edit profile'}
        </button>
      </div>

      {editing && (
        <div className="mb-8 rounded-xl bg-white p-4">
          <SellerProfileForm seller={seller} onDone={() => setEditing(false)} />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-emerald-brand">Your listings</h2>
        <Link to="/seller/listings/new"
          className="rounded-full bg-emerald-brand px-5 py-2 text-sm text-cream">
          Add listing
        </Link>
      </div>

      {listings.length === 0 && <p className="text-sm">No listings yet. Add your first product or service.</p>}

      <ul className="flex flex-col gap-3">
        {listings.map((l) => (
          <li key={l.id} className="flex items-center gap-4 rounded-xl bg-white p-3">
            {l.thumb
              ? <img src={l.thumb} alt="" className="h-16 w-16 rounded-lg object-cover" />
              : <div className="h-16 w-16 rounded-lg bg-cream" />}
            <div className="flex-1">
              <p className="font-medium">{l.title}</p>
              <p className="text-sm">
                {l.type === 'service' ? 'Service' : 'Product'} · {formatZAR(l.priceCents)} ·{' '}
                {l.active ? 'Live' : 'Hidden'}
              </p>
            </div>
            <Link to={`/seller/listings/${l.id}/edit`} className="text-sm text-emerald-brand underline">Edit</Link>
            <button onClick={() => updateDoc(doc(db, 'listings', l.id), { active: !l.active })}
              className="text-sm text-gold-deep underline">
              {l.active ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => deleteListing(l.id)} className="text-sm text-red-700 underline">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}