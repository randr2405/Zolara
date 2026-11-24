import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { resizeImage } from '../lib/images'
import { mainCategories, subCategories, categoryNote } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'

const MAX_IMAGES = 4

const btn =
  'inline-flex min-h-[48px] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-60'
const btnPrimary = `${btn} bg-emerald-brand text-cream hover:bg-emerald-brand/90`
const btnQuiet = `${btn} border border-gold-deep text-gold-deep hover:bg-cream`

const inputClass =
  'min-h-[48px] w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold'

const ICONS = {
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  clock: 'M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  back: 'M15 6l-6 6 6 6',
  upload: 'M12 16V5 M7 9l5-5 5 5 M5 20h14',
  close: 'M6 6l12 12 M18 6L6 18',
}

function Icon({ name, size = 20 }) {
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

function Section({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-gold/40 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-semibold text-emerald-brand">{title}</h2>
      {hint && <p className="mt-1 text-sm text-charcoal/70">{hint}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
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

function Skeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-5 py-8 sm:px-8" role="status" aria-label="Loading form">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-4 rounded-2xl border border-gold/30 bg-white p-6">
          <div className="h-5 w-1/3 rounded bg-cream" />
          <div className="mt-4 h-12 w-full rounded-xl bg-cream" />
          <div className="mt-3 h-12 w-full rounded-xl bg-cream" />
        </div>
      ))}
    </div>
  )
}

export default function ListingForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [seller, setSeller] = useState(null)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({
    type: 'product', title: '', description: '', category: '', subcategory: '',
    price: '', stock: '1', duration: '60',
  })
  const [existing, setExisting] = useState([])
  const [removed, setRemoved] = useState([])
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => {
    async function load() {
      try {
        const s = await getDoc(doc(db, 'sellers', user.uid))
        if (!s.exists()) return navigate('/seller')
        setSeller(s.data())
        if (id) {
          const l = await getDoc(doc(db, 'listings', id))
          if (!l.exists() || l.data().sellerId !== user.uid) return navigate('/seller')
          const d = l.data()
          setForm({
            type: d.type, title: d.title, description: d.description,
            category: d.category || '', subcategory: d.subcategory || '',
            price: (d.priceCents / 100).toString(),
            stock: String(d.stock ?? 1), duration: String(d.durationMinutes ?? 60),
          })
          const ph = await getDocs(query(collection(db, 'listings', id, 'photos'), orderBy('order')))
          setExisting(ph.docs.map((p) => ({ id: p.id, data: p.data().data })))
        }
        setReady(true)
      } catch (err) {
        console.error(err)
        setLoadError('Could not load this page. Please refresh and try again.')
      }
    }
    load()
  }, [id, user.uid, navigate])

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function pickFiles(e) {
    const room = MAX_IMAGES - existing.length
    const picked = Array.from(e.target.files).slice(0, room)
    e.target.value = ''
    setFiles(picked)
  }

  function removeNewPhoto(index) {
    setFiles(files.filter((_, i) => i !== index))
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
        subcategory: form.subcategory,
        priceCents: Math.round(parseFloat(form.price) * 100),
        stock: isProduct ? parseInt(form.stock, 10) : null,
        durationMinutes: isProduct ? null : parseInt(form.duration, 10),
        thumb,
        sellerId: user.uid,
        sellerName: seller.businessName,
        city: seller.city,
        province: seller.province || '',
      }

      let listingId = id
      if (id) {
        await updateDoc(doc(db, 'listings', id), data)
      } else {
        const ref = await addDoc(collection(db, 'listings'), {
          ...data,
          active: true,
          sellerApproved: seller.status === 'approved',
          sellerPreferred: seller.preferred === true,
          createdAt: serverTimestamp(),
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

  if (loadError) {
    return (
      <div className="bg-cream px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p role="alert" className="text-sm text-red-800">{loadError}</p>
          <Link to="/seller" className={`${btnPrimary} mt-5`}>
            Back to your dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!ready) return <div className="bg-cream"><Skeleton /></div>

  const subs = form.category ? subCategories(form.category, form.type) : []
  const note = categoryNote(form.category)
  const isProduct = form.type === 'product'
  const photoCount = existing.length + files.length
  const canAddPhotos = existing.length < MAX_IMAGES

  const typeOptions = [
    ['product', 'Product', 'Something you sell and ship or hand over', 'box'],
    ['service', 'Service', 'Something you do, booked for a time slot', 'clock'],
  ]

  return (
    <div className="bg-cream">
      <header className="border-b-4 border-gold bg-emerald-brand px-5 pb-8 pt-9 text-cream sm:px-8 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/seller"
            className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-cream/85 hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <Icon name="back" size={18} />
            Back to dashboard
          </Link>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {id ? 'Edit listing' : 'Add a listing'}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-cream/85 sm:text-base">
            Clear photos and a good description help customers choose you.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Section title="What are you listing?">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Listing type">
              {typeOptions.map(([t, label, hint, icon]) => (
                <label
                  key={t}
                  className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-gold ${
                    form.type === t ? 'border-emerald-brand bg-cream' : 'border-gold/50 bg-white hover:bg-cream'}`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={(e) => setForm({ ...form, type: e.target.value, category: '', subcategory: '' })}
                    className="sr-only"
                  />
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-full ${
                      form.type === t ? 'bg-emerald-brand text-gold' : 'bg-cream text-gold-deep'}`}
                  >
                    <Icon name={icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-emerald-brand">{label}</span>
                    <span className="mt-0.5 block text-xs text-charcoal/70">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Details">
            <Field label="Title" htmlFor="lf-title">
              <input
                id="lf-title"
                required
                placeholder={isProduct ? 'e.g. Handmade leather wallet' : 'e.g. Deep house clean'}
                value={form.title}
                onChange={set('title')}
                className={inputClass}
              />
            </Field>
            <Field label="Description" htmlFor="lf-description" hint="What is included, who it is for, and anything the customer should know.">
              <textarea
                id="lf-description"
                required
                rows={5}
                placeholder="Describe it"
                value={form.description}
                onChange={set('description')}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title="Category">
            <Field label="Category" htmlFor="lf-category">
              <select
                id="lf-category"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}
                className={inputClass}
              >
                <option value="">Choose a category</option>
                {mainCategories(form.type).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            {form.category && (
              <Field label="Sub-category" htmlFor="lf-subcategory">
                <select
                  id="lf-subcategory"
                  required
                  value={form.subcategory}
                  onChange={set('subcategory')}
                  className={inputClass}
                >
                  <option value="">Choose a sub-category</option>
                  {subs.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            )}
            {note && (
              <p className="rounded-xl border-l-4 border-gold bg-cream px-4 py-3 text-sm text-gold-deep">{note}</p>
            )}
          </Section>

          <Section title={isProduct ? 'Price and stock' : 'Price and duration'}>
            <Field label="Price" htmlFor="lf-price" hint="In South African rand, e.g. 250">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium text-gold-deep">
                  R
                </span>
                <input
                  id="lf-price"
                  required
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  placeholder="250"
                  value={form.price}
                  onChange={set('price')}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>
            {isProduct ? (
              <Field label="Stock available" htmlFor="lf-stock" hint="Customers cannot buy once this reaches 0.">
                <input
                  id="lf-stock"
                  required
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="1"
                  value={form.stock}
                  onChange={set('stock')}
                  className={inputClass}
                />
              </Field>
            ) : (
              <Field label="Duration (minutes)" htmlFor="lf-duration" hint="In steps of 15 minutes, e.g. 60 for one hour.">
                <input
                  id="lf-duration"
                  required
                  type="number"
                  inputMode="numeric"
                  min="15"
                  step="15"
                  placeholder="60"
                  value={form.duration}
                  onChange={set('duration')}
                  className={inputClass}
                />
              </Field>
            )}
          </Section>

          <Section
            title={`Photos (${photoCount} of ${MAX_IMAGES})`}
            hint="The first photo is used as the main picture in the shop."
          >
            {(existing.length > 0 || previews.length > 0) && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {existing.map((p, i) => (
                  <li key={p.id} className="relative overflow-hidden rounded-xl border border-gold/40 bg-cream">
                    <img src={p.data} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-emerald-brand px-2 py-0.5 text-[11px] font-medium text-cream">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-1.5 top-1.5 grid h-10 w-10 place-items-center rounded-full bg-red-700 text-white shadow transition hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
                {previews.map((url, i) => (
                  <li key={url} className="relative overflow-hidden rounded-xl border border-dashed border-gold bg-cream">
                    <img src={url} alt={`New photo ${i + 1}`} className="aspect-square w-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gold px-2 py-0.5 text-[11px] font-medium text-emerald-brand">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(i)}
                      aria-label={`Remove new photo ${i + 1}`}
                      className="absolute right-1.5 top-1.5 grid h-10 w-10 place-items-center rounded-full bg-red-700 text-white shadow transition hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {canAddPhotos ? (
              <label
                htmlFor="lf-photos"
                className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gold/60 bg-cream px-4 py-5 text-center transition focus-within:ring-2 focus-within:ring-gold hover:bg-cream/70"
              >
                <span className="text-gold-deep"><Icon name="upload" size={24} /></span>
                <span className="text-sm font-medium text-emerald-brand">
                  {files.length > 0 ? 'Choose different photos' : 'Add photos'}
                </span>
                <span className="text-xs text-charcoal/70">
                  Up to {MAX_IMAGES - existing.length} more. Large images are resized for you.
                </span>
                <input
                  id="lf-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={pickFiles}
                  className="sr-only"
                />
              </label>
            ) : (
              <p className="rounded-xl bg-cream px-4 py-3 text-sm text-gold-deep">
                You have reached the limit of {MAX_IMAGES} photos. Remove one to add another.
              </p>
            )}
            {files.length > 0 && (
              <p role="status" className="text-xs text-charcoal/70">
                {files.length} new {files.length === 1 ? 'photo' : 'photos'} ready to save.
              </p>
            )}
          </Section>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to="/seller" className={`${btnQuiet} w-full sm:w-auto`}>
              Cancel
            </Link>
            <button disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
              {busy ? 'Saving…' : 'Save listing'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}