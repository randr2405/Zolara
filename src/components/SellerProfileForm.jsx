import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { resizeImage } from '../lib/images'
import { useAuth } from '../context/AuthContext.jsx'

const input = 'rounded-lg border border-gold/50 bg-white p-3'

export default function SellerProfileForm({ seller, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    businessName: seller?.businessName || '',
    description: seller?.description || '',
    city: seller?.city || '',
    phone: seller?.phone || '',
  })
  const [logo, setLogo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = { ...form }
      if (logo) data.logoUrl = await resizeImage(logo, 200, 0.8)
      if (!seller) {
        data.verified = false
        data.createdAt = serverTimestamp()
      }
      await setDoc(doc(db, 'sellers', user.uid), data, { merge: true })
      onDone?.()
    } catch (err) {
      console.error(err)
      setError('Could not save your profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input required placeholder="Business name" value={form.businessName}
        onChange={set('businessName')} className={input} />
      <textarea required rows={4} placeholder="Tell customers about your business"
        value={form.description} onChange={set('description')} className={input} />
      <input required placeholder="City or town (e.g. Durban)" value={form.city}
        onChange={set('city')} className={input} />
      <input required placeholder="Contact phone number" value={form.phone}
        onChange={set('phone')} className={input} />
      <label className="text-sm">
        Logo (optional)
        <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0])}
          className="mt-1 block w-full text-sm" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        {seller && (
          <button type="button" onClick={onDone}
            className="rounded-full border border-gold-deep px-6 py-3 text-gold-deep">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}