import { useCallback, useEffect, useRef, useState } from 'react'
import { TERMS } from '../lib/legal.js'

const SUPPORT_EMAIL = 'info@rragencies.co.za'
const NAV_OFFSET = 64

const ICONS = {
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z M8 8h6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 3.6-6 8-6s8 2 8 6',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9 12l2 2 4-4',
  bag: 'M5 8h14l-1 12H6z M9 8V6a3 3 0 016 0v2',
  wallet: 'M4 7h15a1 1 0 011 1v11H5a1 1 0 01-1-1z M4 7l12-3v3 M16 14h2',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  refund: 'M4 12a8 8 0 018-8 8 8 0 016 2.7L20 8 M20 4v4h-4 M20 12a8 8 0 01-8 8 8 8 0 01-6-2.7L4 16 M4 20v-4h4',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18z M5.6 5.6l12.8 12.8',
  scale: 'M12 4v16 M7 20h10 M5 7h14 M5 7l-3 7a3 3 0 006 0z M19 7l-3 7a3 3 0 006 0z',
  chat: 'M4 5h16v11H9l-5 4z',
  flag: 'M6 21V4 M6 4h11l-2 4 2 4H6',
  building: 'M5 21V4h9v17 M14 9h5v12 M8 8h3 M8 12h3 M8 16h3',
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M6 9l6 6 6-6',
}

const ICON_RULES = [
  [/account|regist|sign|member|user|eligib|who/i, 'user'],
  [/privacy|data|personal|cookie|secur/i, 'lock'],
  [/pay|fee|price|charge|billing|subscription/i, 'wallet'],
  [/refund|return|cancel/i, 'refund'],
  [/order|booking|purchase|buy|deliver|shipping/i, 'bag'],
  [/prohibit|cannot|must not|restrict|forbidden|conduct|misuse/i, 'ban'],
  [/liab|disclaim|warrant|responsib|law|govern|disput|indemn/i, 'scale'],
  [/complain|feedback|review|contact|support/i, 'chat'],
  [/terminat|suspend|remov|breach/i, 'flag'],
  [/supplier|seller|marketplace|zolara|owner|about/i, 'building'],
  [/protect|safe|trust|content|intellectual|licen/i, 'shield'],
]

function iconFor(heading) {
  const hit = ICON_RULES.find(([pattern]) => pattern.test(heading))
  return hit ? hit[1] : 'book'
}

function cleanTitle(heading) {
  return String(heading).replace(/^\d+\.\s*/, '')
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

function Body({ section }) {
  const paras = section.paras || []
  const bullets = section.bullets || []
  return (
    <>
      {paras.map((p, k) => (
        <p key={k} className="tr-p">
          {p}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="tr-list">
          {bullets.map((item, k) => (
            <li key={k}>{item}</li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function Terms() {
  const doc = TERMS || {}
  const sections = doc.sections || []
  const highlights = doc.highlights || []
  const title = doc.title || 'Terms of Use'
  const [open, setOpen] = useState(() => new Set([0]))
  const [active, setActive] = useState(0)
  const sectionRefs = useRef([])
  const chipsRef = useRef(null)
  const chipRefs = useRef([])
  const barRef = useRef(null)

  useEffect(() => {
    const previous = document.title
    document.title = `${title} | Zolara`
    return () => {
      document.title = previous
    }
  }, [title])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      const max = root.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`
      let current = 0
      sectionRefs.current.forEach((el, k) => {
        if (el && el.getBoundingClientRect().top <= NAV_OFFSET + 120) current = k
      })
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const row = chipsRef.current
    const chip = chipRefs.current[active]
    if (!row || !chip) return
    const target = chip.offsetLeft - (row.clientWidth - chip.clientWidth) / 2
    row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [active])

  const toggle = useCallback((index) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const toggleAll = () => {
    setOpen((prev) => (prev.size === sections.length ? new Set() : new Set(sections.map((_, k) => k))))
  }

  const goTo = (index) => {
    setOpen((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      const el = sectionRefs.current[index]
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }

  const allOpen = sections.length > 0 && open.size === sections.length

  return (
    <div className="tr" style={{ '--tr-nav': `${NAV_OFFSET}px` }}>
      <style>{STYLES}</style>
      <div className="tr-progress" aria-hidden="true">
        <div ref={barRef} className="tr-progress-bar" />
      </div>

      <header className="tr-hero">
        <div className="tr-hero-inner">
          <h1 className="tr-title">{title}</h1>
          {doc.intro && <p className="tr-intro">{doc.intro}</p>}
        </div>
      </header>

      {highlights.length > 0 && (
        <section className="tr-short-wrap" aria-label="In short">
          <div className="tr-short">
            <h2 className="tr-short-title">In short</h2>
            <ul className="tr-short-list">
              {highlights.map((item, k) => (
                <li key={k}>
                  <span className="tr-tick">
                    <Icon name="tick" size={14} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {sections.length > 0 && (
        <div className="tr-chips" role="navigation" aria-label="Jump to a section">
          <div ref={chipsRef} className="tr-chips-row">
            {sections.map((section, k) => (
              <button
                key={`${section.heading}-${k}`}
                ref={(el) => {
                  chipRefs.current[k] = el
                }}
                type="button"
                className={`tr-chip${active === k ? ' is-active' : ''}`}
                aria-current={active === k ? 'true' : undefined}
                onClick={() => goTo(k)}
              >
                <span className="tr-chip-n">{k + 1}</span>
                {cleanTitle(section.heading)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tr-layout">
        <aside className="tr-side">
          <nav aria-label="Sections">
            <p className="tr-side-title">On this page</p>
            <ol className="tr-toc">
              {sections.map((section, k) => (
                <li key={`${section.heading}-${k}`}>
                  <button
                    type="button"
                    className={`tr-toc-btn${active === k ? ' is-active' : ''}`}
                    aria-current={active === k ? 'true' : undefined}
                    onClick={() => goTo(k)}
                  >
                    <span className="tr-toc-n">{k + 1}</span>
                    <span>{cleanTitle(section.heading)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <main className="tr-main">
          <div className="tr-toolbar">
            <p className="tr-count">{sections.length} sections</p>
            <button type="button" className="tr-toggle-all" onClick={toggleAll}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          <div className="tr-items">
            {sections.map((section, k) => {
              const isOpen = open.has(k)
              return (
                <section
                  key={`${section.heading}-${k}`}
                  id={`tr-section-${k + 1}`}
                  ref={(el) => {
                    sectionRefs.current[k] = el
                  }}
                  className={`tr-item${isOpen ? ' is-open' : ''}`}
                >
                  <h2 className="tr-item-h">
                    <button
                      type="button"
                      className="tr-item-btn"
                      aria-expanded={isOpen}
                      aria-controls={`tr-panel-${k + 1}`}
                      id={`tr-head-${k + 1}`}
                      onClick={() => toggle(k)}
                    >
                      <span className="tr-badge">
                        <Icon name={iconFor(section.heading)} size={20} />
                      </span>
                      <span className="tr-item-text">
                        <span className="tr-item-num">Section {k + 1}</span>
                        <span className="tr-item-title">{cleanTitle(section.heading)}</span>
                      </span>
                      <span className="tr-chevron">
                        <Icon name="chevron" size={20} />
                      </span>
                    </button>
                  </h2>
                  <div className="tr-panel" id={`tr-panel-${k + 1}`} role="region" aria-labelledby={`tr-head-${k + 1}`}>
                    <div className="tr-panel-clip">
                      <div className="tr-panel-body">
                        <Body section={section} />
                      </div>
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          <section className="tr-cta">
            <div>
              <h2 className="tr-cta-title">Questions about these terms?</h2>
              <p className="tr-cta-text">Email us and a person from the Zolara team will get back to you.</p>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="tr-btn">
              {SUPPORT_EMAIL}
            </a>
          </section>
        </main>
      </div>
    </div>
  )
}

const STYLES = `
.tr {
  --emerald: #0B3D2E;
  --gold: #C9A24B;
  --gold-deep: #A67C2E;
  --cream: #FAF6EE;
  --cream-2: #F3ECDC;
  --ink: #2B2B2B;
  --muted: #5C5A50;
  --line: #E6DDC8;
  background: var(--cream);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.65;
  min-height: 100vh;
  overflow-x: clip;
}
.tr *, .tr *::before, .tr *::after { box-sizing: border-box; }
.tr button { font: inherit; color: inherit; }
.tr a:focus-visible,
.tr button:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 2px;
}

.tr-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
}
.tr-progress-bar {
  height: 100%;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: left;
}

.tr-hero {
  background: var(--emerald);
  color: var(--cream);
  border-bottom: 4px solid var(--gold);
  padding: 56px 20px 96px;
}
.tr-hero-inner { max-width: 1120px; margin: 0 auto; }
.tr-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: clamp(2.1rem, 6vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
}
.tr-intro { max-width: 62ch; margin: 0; font-size: 1.05rem; color: #E4EBE6; }

.tr-short-wrap {
  max-width: 1120px;
  margin: -60px auto 0;
  padding: 0 20px;
  position: relative;
}
.tr-short {
  background: #fff;
  border: 1px solid var(--line);
  border-top: 4px solid var(--gold);
  border-radius: 16px;
  padding: 20px 18px;
  box-shadow: 0 10px 24px -16px rgba(11, 61, 46, 0.45);
}
.tr-short-title {
  margin: 0 0 12px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.2rem;
  color: var(--emerald);
}
.tr-short-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.tr-short-list li { display: flex; gap: 12px; align-items: flex-start; }
.tr-tick {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--emerald);
  color: var(--gold);
}

.tr-chips {
  position: sticky;
  top: var(--tr-nav);
  z-index: 30;
  margin-top: 24px;
  background: rgba(250, 246, 238, 0.96);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.tr-chips-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 20px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.tr-chips-row::-webkit-scrollbar { display: none; }
.tr-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px 0 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 0.92rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.tr-chip-n {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--cream-2);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--emerald);
}
.tr-chip.is-active { background: var(--emerald); border-color: var(--emerald); color: var(--cream); }
.tr-chip.is-active .tr-chip-n { background: var(--gold); color: var(--emerald); }

.tr-layout {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 72px;
  display: block;
}
.tr-side { display: none; }

.tr-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.tr-count { margin: 0; color: var(--muted); font-size: 0.92rem; }
.tr-toggle-all {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--emerald);
  background: transparent;
  color: var(--emerald);
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
}
.tr-toggle-all:hover { background: var(--emerald); color: var(--cream); }

.tr-items { display: grid; gap: 12px; }
.tr-item {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  scroll-margin-top: calc(var(--tr-nav) + 76px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.tr-item.is-open {
  border-color: var(--gold);
  box-shadow: 0 14px 30px -22px rgba(11, 61, 46, 0.5);
}
.tr-item-h { margin: 0; font-size: inherit; }
.tr-item-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 14px 16px;
  background: none;
  border: 0;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
}
.tr-badge {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--emerald);
  color: var(--gold);
}
.tr-item.is-open .tr-badge { background: var(--gold); color: var(--emerald); }
.tr-item-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.tr-item-num { font-size: 0.8rem; color: var(--muted); line-height: 1.3; }
.tr-item-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: 1.08rem;
  line-height: 1.3;
  color: var(--emerald);
}
.tr-chevron {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--emerald);
  transition: transform 0.25s ease;
}
.tr-item.is-open .tr-chevron { transform: rotate(180deg); }

.tr-panel {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition: grid-template-rows 0.28s ease, visibility 0s linear 0.28s;
}
.tr-item.is-open .tr-panel {
  grid-template-rows: 1fr;
  visibility: visible;
  transition: grid-template-rows 0.28s ease, visibility 0s linear 0s;
}
.tr-panel-clip { overflow: hidden; min-height: 0; }
.tr-panel-body { padding: 4px 18px 22px; }
.tr-p { margin: 0 0 14px; max-width: 68ch; }
.tr-p:last-child { margin-bottom: 0; }

.tr-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
  max-width: 68ch;
}
.tr-p + .tr-list { margin-top: 4px; }
.tr-list li { position: relative; padding-left: 22px; }
.tr-list li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.62em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
}

.tr-cta {
  margin-top: 28px;
  padding: 28px 22px;
  border-radius: 18px;
  background: var(--emerald);
  color: var(--cream);
  border-bottom: 4px solid var(--gold);
  display: grid;
  gap: 18px;
}
.tr-cta-title {
  margin: 0 0 6px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.5rem;
  line-height: 1.2;
}
.tr-cta-text { margin: 0; max-width: 52ch; color: #E4EBE6; }
.tr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--emerald);
  font-weight: 700;
  text-decoration: none;
  overflow-wrap: anywhere;
  transition: background 0.2s ease;
}
.tr-btn:hover { background: #D9B665; }
.tr-cta .tr-btn:focus-visible { outline-color: var(--cream); }

@media (min-width: 640px) {
  .tr-hero { padding: 72px 32px 112px; }
  .tr-short-wrap { padding: 0 32px; margin-top: -64px; }
  .tr-short { padding: 24px 28px; }
  .tr-short-list { grid-template-columns: 1fr 1fr; gap: 14px 28px; }
  .tr-chips-row { padding: 10px 32px; }
  .tr-layout { padding: 28px 32px 88px; }
  .tr-panel-body { padding: 4px 24px 26px; }
  .tr-item-btn { padding: 16px 22px; }
}

@media (min-width: 960px) {
  .tr-chips { display: none; }
  .tr-layout {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 40px;
    padding-top: 40px;
  }
  .tr-side {
    display: block;
    position: sticky;
    top: calc(var(--tr-nav) + 20px);
    align-self: start;
    max-height: calc(100vh - var(--tr-nav) - 40px);
    overflow-y: auto;
  }
  .tr-item { scroll-margin-top: calc(var(--tr-nav) + 20px); }
  .tr-side-title {
    margin: 0 0 10px;
    font-weight: 700;
    color: var(--emerald);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
  }
  .tr-toc { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; border-left: 2px solid var(--line); }
  .tr-toc-btn {
    width: 100%;
    display: flex;
    gap: 10px;
    align-items: baseline;
    text-align: left;
    padding: 8px 10px 8px 14px;
    margin-left: -2px;
    background: none;
    border: 0;
    border-left: 2px solid transparent;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.35;
    cursor: pointer;
  }
  .tr-toc-btn:hover { color: var(--emerald); background: var(--cream-2); }
  .tr-toc-btn.is-active {
    color: var(--emerald);
    font-weight: 700;
    border-left-color: var(--gold);
    background: var(--cream-2);
  }
  .tr-toc-n { flex: 0 0 auto; min-width: 1.4em; font-variant-numeric: tabular-nums; color: var(--gold-deep); font-weight: 700; }
  .tr-cta { grid-template-columns: 1fr auto; align-items: center; padding: 32px 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .tr-panel,
  .tr-item.is-open .tr-panel,
  .tr-chevron,
  .tr-item,
  .tr-btn { transition: none; }
  .tr-chips-row { scroll-behavior: auto; }
}
`