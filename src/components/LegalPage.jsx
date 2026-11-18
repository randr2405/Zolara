import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LAST_UPDATED, OWNER } from '../lib/legal.js'

export default function LegalPage({ doc }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-3xl font-semibold text-emerald-brand">{doc.title}</h1>
      <p className="mb-6 text-sm text-gold-deep">Last updated {LAST_UPDATED}</p>
      <p className="mb-8 leading-relaxed">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.heading} className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-emerald-brand">{s.heading}</h2>
          {s.paras?.map((p) => <p key={p} className="mb-2 leading-relaxed">{p}</p>)}
          {s.bullets && (
            <ul className="ml-5 list-disc leading-relaxed">
              {s.bullets.map((b) => <li key={b} className="mb-1">{b}</li>)}
            </ul>
          )}
        </section>
      ))}

      <p className="mt-8 text-sm">
        Questions? Email {OWNER} at {CONTACT_EMAIL}.
      </p>
      <p className="mt-4 text-sm">
        <Link to="/terms" className="text-emerald-brand underline">Terms of Use</Link>
        {' · '}
        <Link to="/privacy" className="text-emerald-brand underline">Privacy Policy</Link>
        {' · '}
        <Link to="/supplier-rules" className="text-emerald-brand underline">Supplier Rules</Link>
      </p>
    </main>
  )
}