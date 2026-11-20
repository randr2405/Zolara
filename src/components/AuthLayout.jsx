import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/zolara-logo.png'

export const field =
  'w-full rounded-xl border border-gold/50 bg-white px-4 py-3 text-sm outline-none transition focus:border-gold-deep focus:ring-2 focus:ring-gold/40'

function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  )
}

export function PasswordInput({ value, onChange, placeholder, minLength, autoComplete }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input required type={shown ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} minLength={minLength} autoComplete={autoComplete}
        className={`${field} pr-12`} />
      <button type="button" onClick={() => setShown(!shown)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gold-deep">
        <Eye off={shown} />
      </button>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-emerald-brand">
      {label}
      {children}
    </label>
  )
}

function Tag({ children, className = '' }) {
  return (
    <span className={`relative inline-block bg-gold py-1 pl-5 pr-3 text-xs font-bold text-emerald-brand [clip-path:polygon(0_50%,10px_0,100%_0,100%_100%,10px_100%)] ${className}`}>
      <i className="absolute left-[7px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white" />
      {children}
    </span>
  )
}

export default function AuthLayout({ heading, subheading, points, tags, children, footer }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gold/60 md:grid-cols-[1fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-emerald-brand p-10 text-cream md:flex">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold/30 blur-3xl" />
          <svg viewBox="0 0 400 400" className="pointer-events-none absolute -bottom-10 -right-10 h-4/5 w-4/5 text-gold" aria-hidden="true">
            <path d="M0 380 C 120 340, 260 200, 400 40 C 330 230, 180 380, 0 400 Z" fill="currentColor" opacity="0.8" />
            <path d="M80 400 C 200 350, 320 270, 400 190 C 360 300, 240 400, 80 400 Z" fill="currentColor" opacity="0.3" />
          </svg>

          <div className="relative">
            <p className="font-display text-5xl font-semibold leading-none">Shop it.</p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none text-gold">Book it.</p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none">Love it.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
          </div>

          <ul className="relative mt-10 flex flex-col gap-3 text-sm">
            {points.map(([title, text]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <span>
                  <span className="block font-semibold text-gold">{title}</span>
                  <span className="text-cream/90">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="p-6 sm:p-10">
          <Link to="/" className="mb-6 inline-block"><img src={logo} alt="Zolara" className="h-10" /></Link>
          <h1 className="font-display text-4xl font-semibold leading-tight text-emerald-brand">{heading}</h1>
          <span className="mb-3 mt-2 block h-0.5 w-12 bg-gold" />
          <p className="mb-6 text-sm">{subheading}</p>
          {children}
          <div className="mt-6 border-t border-gold/40 pt-4 text-sm">{footer}</div>
        </section>
      </div>
    </main>
  )
}