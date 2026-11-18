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
  const [app, setApp] = useState({ registrationNumber: '', references: '', examples: '' })
  const [logo, setLogo] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setA = (k) => (e) => setApp({ ...app, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = { ...form }
      if (logo) data.logoUrl = await resizeImage(logo, 200, 0.8)
      if (!seller) {
        data.verified = false
        data.status = 'pending'
        data.createdAt = serverTimestamp()
        data.acceptedRulesAt = serverTimestamp()
        data.rulesVersion = '1.0'
      }
      await setDoc(doc(db, 'sellers', user.uid), data, { merge: true })
      if (!seller) {
        await setDoc(doc(db, 'applications', user.uid), {
          ...app,
          submittedAt: serverTimestamp(),
        })
      }
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

      {!seller && (
        <>
          <div className="rounded-lg bg-white p-3 text-xs">
            Every supplier is reviewed before their listings go live. These details are private and
            only the Zolara team can see them. After you submit, we may contact you for a copy of
            your ID and proof of address.
          </div>
          <input placeholder="Business registration number (if you are a registered business)"
            value={app.registrationNumber} onChange={setA('registrationNumber')} className={input} />
          <textarea required rows={3}
            placeholder="Two references: name and phone number or email for each"
            value={app.references} onChange={setA('references')} className={input} />
          <textarea required rows={3}
            placeholder="Examples of your work or products: links (website, Facebook, Instagram) or a short description"
            value={app.examples} onChange={setA('examples')} className={input} />

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
            <span>
              I have read and agree to the{' '}
              <a href="/supplier-rules" target="_blank" rel="noreferrer"
                className="text-emerald-brand underline">supplier rules</a>.
            </span>
          </label>
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          className="rounded-full bg-emerald-brand px-6 py-3 text-cream disabled:opacity-60">
          {busy ? 'Saving…' : seller ? 'Save profile' : 'Submit for review'}
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