import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { resizeImage } from '../lib/images'
import { CATEGORIES } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'

const input = 'rounded-lg border border-gold/50 bg-white p-3'
const MAX_IMAGES = 4

export default function ListingForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [seller, setSeller] = useState(null)
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState({
    type: 'product', title: '', description: '', category: '', price: '', stock: '1', duration: '60',
  })
  const [existing, setExisting] = useState([]) // [{ id, data }]
  const [removed, setRemoved] = useState([])
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    async function load() {
      const s = await getDoc(doc(db, 'sellers', user.uid))
      if (!s.exists()) return navigate('/seller')
      setSeller(s.data())
      if (id) {
        const l = await getDoc(doc(db, 'listings', id))
        if (!l.exists() || l.data().sellerId !== user.uid) return navigate('/seller')
        const d = l.data()
        setForm({
          type: d.type, title: d.title, description: d.description, category: d.category,
          price: (d.priceCents / 100).toString(),
          stock: String(d.stock ?? 1), duration: String(d.durationMinutes ?? 60),
        })
        const ph = await getDocs(query(collection(db, 'listings', id, 'photos'), orderBy('order')))
        setExisting(ph.docs.map((p) => ({ id: p.id, data: p.data().data })))
      }
      setReady(true)
    }
    load()
  }, [id, user.uid, navigate])

  function pickFiles(e) {
    const room = MAX_IMAGES - existing.length
    setFiles(Array.from(e.target.files).slice(0, room))
  }

  function removePhoto(photo) {
    setExisting(existing.filter((p) => p.id !== photo.id))
    setRemoved([...removed, photo.id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const newPhotos = await Promise.all(files.map((f) => resizeImage(f, 800, 0.75)))
      const allPhotos = [...existing.map((p) => p.data), ...newPhotos]
      const thumb = allPhotos[0] ? await resizeImage(allPhotos[0], 360, 0.7) : null

      const isProduct = form.type === 'product'
      const data = {
        type: form.type,
        title: form.title,
        description: form.description,
        category: form.category,
        priceCents: Math.round(parseFloat(form.price) * 100),
        stock: isProduct ? parseInt(form.stock, 10) : null,
        durationMinutes: isProduct ? null : parseInt(form.duration, 10),
        thumb,
        sellerId: user.uid,
        sellerName: seller.businessName,
        city: seller.city,
      }

      let listingId = id
      if (id) {
        await updateDoc(doc(db, 'listings', id), data)
      } else {
        const ref = await addDoc(collection(db, 'listings'), {
          ...data, active: true, createdAt: serverTimestamp(),
        })
        listingId = ref.id
      }

      await Promise.all(removed.map((pid) => deleteDoc(doc(db, 'listings', listingId, 'photos', pid))))
      await Promise.all(
        newPhotos.map((photo, i) =>
          addDoc(collection(db, 'listings', listingId, 'photos'), { data: photo, order: Date.now() + i })
        )
      )
      navigate('/seller')
    } catch (err) {
      console.error(err)
      setError('Could not save the listing. Please try again.')
      setBusy(false)
    }
  }

  if (!ready) return <p className="p-6 text-center">Loading…</p>

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-emerald-brand">
        {id ? 'Edit listing' : 'Add a listing'}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {['product', 'service'].map((t) => (
            <label key={t}
              className={`cursor-pointer rounded-xl border p-3 text-center text-sm ${
                form.type === t ? 'border-emerald-brand bg-white' : 'border-gold/50'}`}>
              <input type="radio" name="type" value={t} checked={form.type === t}
                onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })}
                className="sr-only" />
              {t === 'product' ? 'Product' : 'Service'}
            </label>
          ))}
        </div>

        <input required placeholder="Title" value={form.title} onChange={set('title')} className={input} />
        <textarea required rows={5} placeholder="Describe it" value={form.description}
          onChange={set('description')} className={input} />

        <select required value={form.category} onChange={set('category')} className={input}>
          <option value="">Choose a category</option>
          {CATEGORIES[form.type].map((c) => <option key={c}>{c}</option>)}
        </select>

        <input required type="number" min="1" step="0.01" placeholder="Price in rand (e.g. 250)"
          value={form.price} onChange={set('price')} className={input} />

        {form.type === 'product' ? (
          <input required type="number" min="0" step="1" placeholder="Stock available"
            value={form.stock} onChange={set('stock')} className={input} />
        ) : (
          <input required type="number" min="15" step="15" placeholder="Duration in minutes"
            value={form.duration} onChange={set('duration')} className={input} />
        )}

        <div>
          <p className="mb-2 text-sm">Photos (up to {MAX_IMAGES})</p>
          <div className="mb-2 flex gap-2">
            {existing.map((p) => (
              <div key={p.id} className="relative">
                <img src={p.data} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => removePhoto(p)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-700 px-1.5 text-xs text-white">
                  ×
                </button>
              </div>
            ))}
          </div>
          {existing.length < MAX_IMAGES && (
            <input type="file" accept="image/*" multiple onChange={pickFiles} className="block w-full text-sm" />
          )}
          {files.length > 0 && <p className="mt-1 text-xs">{files.length} new photo(s) ready to save</p>}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Saving…' : 'Save listing'}
        </button>
      </form>
    </main>
  )
}