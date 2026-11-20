import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LAST_UPDATED, OWNER } from '../lib/legal.js'

const RELATED = [
  ['/terms', 'Terms of Use'],
  ['/privacy', 'Privacy Policy'],
  ['/supplier-rules', 'Supplier Rules'],
  ['/about', 'About Zolara'],
  ['/contact', 'Contact us'],
]

function Toc({ sections }) {
  return (
    <ol className="flex flex-col gap-0.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.heading}>
          <a href={`#section-${i + 1}`}
            className="block rounded-lg px-3 py-1.5 transition hover:bg-cream hover:text-emerald-brand">
            {s.heading}
          </a>
        </li>
      ))}
    </ol>
  )
}

export default function LegalPage({ doc }) {
  const related = RELATED.filter(([to]) => to !== doc.path)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="relative overflow-hidden rounded-2xl bg-emerald-brand p-8 text-cream shadow-lg ring-1 ring-gold/60 sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gold/30 blur-3xl" />
        <svg viewBox="0 0 400 400" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 text-gold" aria-hidden="true">
          <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.7" />
          <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.3" />
        </svg>
        <div className="relative max-w-2xl">
          <p className="text-sm uppercase tracking-widest text-gold">Zolara</p>
          <h1 className="mt-1 font-display text-5xl font-semibold leading-none sm:text-6xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-gold">Last updated {LAST_UPDATED}</p>
          <p className="mt-5 text-sm leading-relaxed sm:text-base">{doc.intro}</p>
        </div>
      </header>

      {doc.highlights && (
        <section className="mt-6 rounded-2xl border border-gold-deep bg-cream p-6">
          <p className="font-display text-2xl font-semibold text-emerald-brand">The short version</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {doc.highlights.map((h) => (
              <li key={h} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gold-deep">
            This summary is a guide only. The full wording below is what applies.
          </p>
        </section>
      )}

      <div className="mt-8 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
        <details className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gold/30 lg:hidden">
          <summary className="cursor-pointer font-display text-xl font-semibold text-emerald-brand">
            On this page
          </summary>
          <div className="mt-2"><Toc sections={doc.sections} /></div>
        </details>

        <aside className="hidden lg:block">
          <div className="sticky top-44 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gold/30">
            <p className="px-3 pb-2 pt-1 font-display text-xl font-semibold text-emerald-brand">On this page</p>
            <Toc sections={doc.sections} />
          </div>
        </aside>

        <div>
          {doc.sections.map((s, i) => (
            <section key={s.heading} id={`section-${i + 1}`}
              className="mb-5 scroll-mt-44 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gold/30">
              <h2 className="font-display text-2xl font-semibold text-emerald-brand">{s.heading}</h2>
              <span className="mb-3 mt-1 block h-0.5 w-12 bg-gold" />
              {s.paras?.map((p) => (
                <p key={p} className="mb-3 text-sm leading-relaxed sm:text-base">{p}</p>
              ))}
              {s.bullets && (
                <ul className="flex flex-col gap-2 text-sm leading-relaxed sm:text-base">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="rounded-xl bg-emerald-brand p-6 text-cream">
            <p className="font-display text-2xl font-semibold text-gold">Questions?</p>
            <p className="mt-1 text-sm">
              Email {OWNER} at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
              {' '}or use the{' '}
              <Link to="/contact" className="underline">contact page</Link>.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {related.map(([to, label]) => (
                <Link key={to} to={to} className="underline hover:text-gold">{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}