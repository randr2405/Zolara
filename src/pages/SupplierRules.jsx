import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BAN_MONTHS, STRIKE_LIMIT, STRIKE_WINDOW_DAYS } from '../lib/strikes.js'
import { OWNER } from '../lib/legal.js'

const MONTHLY_FEE = 'R250'
const FREE_MONTHS = 3
const APPLY_PATH = '/become-a-supplier'
const SUPPORT_EMAIL = 'info@rragencies.co.za'
const NAV_OFFSET = 64

const RULES = {
  path: '/supplier-rules',
  title: 'Supplier Rules',
  intro:
    'How to join Zolara, what we expect, how you are paid, and what happens if standards slip. By applying to sell on Zolara, you agree to these rules and to the Terms of Use.',
  highlights: [
    `Your first ${FREE_MONTHS} months after approval are free. After that the supplier access fee is ${MONTHLY_FEE} per month, and Zolara takes no commission on your sales.`,
    'PayFast’s processing fee on each sale is deducted from what we pay you, and shows on your Payments page.',
    'Earnings are paid every two weeks into the bank account you give us.',
    `${STRIKE_LIMIT} valid complaints within ${STRIKE_WINDOW_DAYS} days means removal, and a ${BAN_MONTHS}-month wait before you can apply again.`,
  ],
  sections: [
    {
      heading: '1. Why we are careful about who joins',
      paras: [
        'Zolara is a calm, trusted place to buy and book from local South Africans. We take onboarding seriously, with real care for the public who spend on Zolara. Every supplier is reviewed so that the products and services we list are of good quality, and so that customers can shop and book with confidence.',
      ],
    },
    {
      heading: '2. Who can sell on Zolara',
      paras: [
        'We accept serious, reliable South African businesses and individuals who can deliver what they list. Before we approve you, we ask for:',
      ],
      bullets: [
        'A copy of your ID',
        'Business registration documents, if you are a registered business',
        'Proof of address',
        'Examples of your work or products',
        'References from customers or other businesses',
        'Your contact phone number and banking details, which are private to you and the Zolara team',
      ],
    },
    {
      heading: '3. Approval',
      paras: [
        'Approval is at our discretion. Your listings are hidden from customers until you are approved. We may ask for more information, and we may reject or remove a supplier who gives false information.',
      ],
    },
    {
      heading: '4. What cannot be listed',
      paras: [
        'Zolara welcomes suppliers in every category we offer, including businesses that compete with each other. The following cannot be listed:',
      ],
      bullets: [
        'Anything illegal, stolen or counterfeit.',
        'Weapons, ammunition and other dangerous goods.',
        'Regulated items such as alcohol, medicines and tobacco, unless you hold every licence the law requires and have shown it to us.',
        'Adult content and services.',
        'Misleading listings, including photos or claims that are not yours or not true.',
        'Listings that do not follow these rules will be removed.',
      ],
    },
    {
      heading: '5. Quality standards',
      bullets: [
        'Describe what you offer honestly, with clear photos and accurate prices.',
        'Only list stock you have, and keep stock levels and availability up to date.',
        'Deliver products and complete services on the time and terms you promise.',
        'Answer customer messages and questions promptly and politely.',
      ],
    },
    {
      heading: '6. Orders, bookings and payment',
      bullets: [
        'Customers send you a request. Accept or decline it as soon as you can. When you accept, confirm the delivery cost if there is one. Customers cannot pay until you accept.',
        'Accepting an order takes the quantity off your stock. If you cancel an accepted order that has not been paid, the stock is returned.',
        'Once the customer has paid through PayFast, you will be emailed and can go ahead. You may only mark an order shipped or a booking completed after the customer has paid.',
        'A paid order or booking cannot be cancelled by you on Zolara. Please contact the Zolara team if there is a problem.',
        'Mark orders as shipped and delivered, and bookings as completed, promptly and honestly. A sale counts towards your balance only after that.',
      ],
    },
    {
      heading: '7. Delivery and shipping',
      paras: [
        'You arrange and manage delivery of your own orders. Zolara does not ship items for you. The customer pays the delivery cost, and for each listing you choose how it works:',
      ],
      options: [
        { title: 'Collection only', text: 'The customer collects from you, so there is no delivery cost.' },
        { title: 'Flat delivery fee', text: 'You set a fixed fee, and the customer sees it before they pay.' },
        { title: 'Free delivery', text: 'You cover delivery, for example on orders above a minimum value.' },
      ],
      bullets: [
        'Services do not have shipping. If you charge a travel or call-out fee, state it clearly in your listing.',
        'If an order is large, heavy or needs special handling, confirm the exact delivery cost when you accept the request, before the customer pays.',
        'The customer pays the item price and the delivery cost together in one PayFast payment. The delivery cost is paid to you as part of the sale.',
        'Pack orders properly, use a tracked or insured method where you can, and ship within the time stated in your listing.',
        'Mark the order shipped once it is on its way, and delivered once it arrives. Keep proof of postage or delivery in case of a dispute.',
        'The order is your responsibility until the customer receives it. If it is lost or damaged in transit, you sort it out with the customer and the courier.',
        'If an item is faulty or not as described, you pay the return shipping. For any other return, say in your listing who pays.',
      ],
    },
    {
      heading: '8. Refunds',
      bullets: [
        'A customer can ask Zolara for a refund on a paid order or booking. Zolara reviews each request.',
        'While a refund request is open, do not ship the order or mark the booking completed until Zolara has decided.',
        'If a refund is approved, the sale no longer counts towards your balance, and we will contact you if it affects a payout.',
      ],
    },
    {
      heading: '9. Customer details',
      paras: [
        'You will see customers’ names, emails, phone numbers and addresses so you can fulfil their order or booking. Use them only for that purpose, and never share them or use them for anything else.',
      ],
    },
    {
      heading: '10. Customer feedback and complaints',
      paras: [
        'After a service is completed or an order is delivered, customers can tell us whether they were satisfied. We take service seriously, and we read every complaint. A satisfaction score appears on your profile once you have enough reviews.',
      ],
    },
    {
      heading: '11. Warnings and removal',
      paras: [
        `We review each complaint before it counts, and you can respond to a complaint before a decision is made. Valid complaints are handled in steps, counted over a rolling ${STRIKE_WINDOW_DAYS} days:`,
      ],
      bullets: [
        'Complaint 1: a written warning.',
        'Complaint 2: a final warning.',
        `Complaint ${STRIKE_LIMIT}: removal from the Zolara supplier database. A removed supplier must wait ${BAN_MONTHS} months before applying to join again.`,
        'Serious misconduct, such as fraud, can lead to immediate removal.',
      ],
    },
    {
      heading: '12. Fair play',
      paras: [
        `Zolara is owned by ${OWNER}. R&R Site Solutions, a division of ${OWNER}, also sells on Zolara as its founding supplier and a preferred supplier, and its listings may be shown first and marked as such. It competes with other suppliers on the same terms as everyone else. Zolara uses administrator access to bookings, orders and supplier details only to run the marketplace, and not for the benefit of any supplier.`,
      ],
    },
    {
      heading: '13. Fees and payouts',
      bullets: [
        `Your first ${FREE_MONTHS} months after approval are free. After that, the supplier access fee is ${MONTHLY_FEE} per month, deducted from your balance.`,
        'Zolara takes no commission on your sales, or on the delivery cost the customer pays you.',
        'PayFast, our payment provider, charges a processing fee on every customer payment, including the delivery cost. The fee depends on how the customer pays, for example by card or Instant EFT. We deduct the exact fee PayFast charged from what we pay you for that sale, and it shows on your Payments page.',
        'Zolara pays your earnings every two weeks into the bank account you give us, after PayFast fees, your subscription and any other amount you owe are deducted. Keep your banking details accurate. We may delay a payout while we confirm a change to them.',
      ],
    },
    {
      heading: '14. Your responsibilities',
      paras: [
        'You are responsible for your own taxes, licences, insurance and compliance with the law, including the Consumer Protection Act 68 of 2008 in the way you sell.',
      ],
    },
    {
      heading: '15. Zolara’s role',
      paras: [
        'Zolara is a marketplace that connects customers with independent suppliers. Suppliers, not Zolara, provide the products and services listed and are responsible for delivery, timing and quality, including courier delays, loss and damage. To the extent the law allows, Zolara is not responsible for delays or problems with a supplier’s products or services, including where a supplier does not deliver. Nothing in these rules limits any rights a customer has under South African law.',
      ],
    },
  ],
}

const FACTS = [
  { value: `${FREE_MONTHS} months`, label: 'free after you are approved' },
  { value: `${MONTHLY_FEE} a month`, label: 'access fee after that' },
  { value: '0%', label: 'commission on your sales' },
  { value: 'Every 2 weeks', label: 'payouts to your bank account' },
]

const TIMELINE = [
  { title: 'Request', text: 'Customer sends it' },
  { title: 'Accept', text: 'You confirm price and delivery' },
  { title: 'Payment', text: 'Customer pays on PayFast' },
  { title: 'Fulfil', text: 'You ship or complete the service' },
  { title: 'Delivered', text: 'You mark it done' },
  { title: 'Balance', text: 'The sale counts to you' },
]

const ICON_KEYS = [
  'shield',
  'user',
  'check',
  'ban',
  'star',
  'bag',
  'truck',
  'refund',
  'lock',
  'chat',
  'flag',
  'scale',
  'wallet',
  'book',
  'building',
]

const ICONS = {
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9 12l2 2 4-4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 3.6-6 8-6s8 2 8 6',
  check: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 12l3 3 5-6',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18z M5.6 5.6l12.8 12.8',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  bag: 'M5 8h14l-1 12H6z M9 8V6a3 3 0 016 0v2',
  truck: 'M3 6h11v10H3z M14 10h4l3 3v3h-7 M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  refund: 'M4 12a8 8 0 018-8 8 8 0 016 2.7L20 8 M20 4v4h-4 M20 12a8 8 0 01-8 8 8 8 0 01-6-2.7L4 16 M4 20v-4h4',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  chat: 'M4 5h16v11H9l-5 4z',
  flag: 'M6 21V4 M6 4h11l-2 4 2 4H6',
  scale: 'M12 4v16 M7 20h10 M5 7h14 M5 7l-3 7a3 3 0 006 0z M19 7l-3 7a3 3 0 006 0z',
  wallet: 'M4 7h15a1 1 0 011 1v11H5a1 1 0 01-1-1z M4 7l12-3v3 M16 14h2',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z M8 8h6',
  building: 'M5 21V4h9v17 M14 9h5v12 M8 8h3 M8 12h3 M8 16h3',
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  cross: 'M6 6l12 12 M18 6L6 18',
  chevron: 'M6 9l6 6 6-6',
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

function cleanTitle(heading) {
  return heading.replace(/^\d+\.\s*/, '')
}

function splitStep(text) {
  const at = text.indexOf(': ')
  if (at === -1) return { label: '', text }
  return { label: text.slice(0, at), text: text.slice(at + 2) }
}

function IconList({ items, tone }) {
  return (
    <ul className={`sr-iconlist sr-iconlist--${tone}`}>
      {items.map((item, k) => (
        <li key={k}>
          <span className="sr-mark">
            <Icon name={tone === 'no' ? 'cross' : 'tick'} size={14} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function DotList({ items }) {
  return (
    <ul className="sr-dotlist">
      {items.map((item, k) => (
        <li key={k}>{item}</li>
      ))}
    </ul>
  )
}

function Note({ children, tone = 'gold' }) {
  return <p className={`sr-note sr-note--${tone}`}>{children}</p>
}

function Timeline() {
  return (
    <ol className="sr-timeline" aria-label="How an order or booking moves from request to payout">
      {TIMELINE.map((step, k) => (
        <li key={step.title}>
          <span className="sr-timeline-n">{k + 1}</span>
          <span className="sr-timeline-t">{step.title}</span>
          <span className="sr-timeline-d">{step.text}</span>
        </li>
      ))}
    </ol>
  )
}

function Options({ items }) {
  return (
    <ul className="sr-options">
      {items.map((item) => (
        <li key={item.title} className="sr-option">
          <span className="sr-option-t">{item.title}</span>
          <span className="sr-option-d">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function Strikes({ items }) {
  return (
    <ol className="sr-strikes">
      {items.map((item, k) => {
        const step = splitStep(item)
        return (
          <li key={k} className={`sr-strike sr-strike--${k + 1}`}>
            <span className="sr-strike-label">{step.label}</span>
            <span className="sr-strike-text">{step.text}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Body({ section, index }) {
  const paras = section.paras || []
  const bullets = section.bullets || []
  const paraEls = paras.map((p, k) => (
    <p key={k} className="sr-p">
      {p}
    </p>
  ))

  if (index === 1) {
    return (
      <>
        {paraEls}
        <IconList items={bullets} tone="yes" />
      </>
    )
  }

  if (index === 3) {
    return (
      <>
        {paraEls}
        <IconList items={bullets.slice(0, -1)} tone="no" />
        <Note>{bullets[bullets.length - 1]}</Note>
      </>
    )
  }

  if (index === 4) {
    return <IconList items={bullets} tone="yes" />
  }

  if (index === 5) {
    return (
      <>
        <Timeline />
        <DotList items={bullets} />
      </>
    )
  }

  if (index === 6) {
    return (
      <>
        {paraEls}
        <Options items={section.options} />
        <DotList items={bullets} />
      </>
    )
  }

  if (index === 10) {
    return (
      <>
        {paraEls}
        <Strikes items={bullets.slice(0, 3)} />
        <Note tone="red">{bullets[3]}</Note>
      </>
    )
  }

  return (
    <>
      {paraEls}
      {bullets.length > 0 && <DotList items={bullets} />}
    </>
  )
}

export default function SupplierRules() {
  const sections = RULES.sections
  const [open, setOpen] = useState(() => new Set([0, 1]))
  const [active, setActive] = useState(0)
  const sectionRefs = useRef([])
  const chipsRef = useRef(null)
  const chipRefs = useRef([])
  const barRef = useRef(null)

  useEffect(() => {
    const previous = document.title
    document.title = `${RULES.title} | Zolara`
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
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

  const allOpen = open.size === sections.length

  return (
    <div className="sr" style={{ '--sr-nav': `${NAV_OFFSET}px` }}>
      <style>{STYLES}</style>
      <div className="sr-progress" aria-hidden="true">
        <div ref={barRef} className="sr-progress-bar" />
      </div>

      <header className="sr-hero">
        <div className="sr-hero-inner">
          <h1 className="sr-title">{RULES.title}</h1>
          <p className="sr-intro">{RULES.intro}</p>
        </div>
      </header>

      <section className="sr-facts-wrap" aria-label="Key facts">
        <ul className="sr-facts">
          {FACTS.map((fact) => (
            <li key={fact.value} className="sr-fact">
              <span className="sr-fact-value">{fact.value}</span>
              <span className="sr-fact-label">{fact.label}</span>
            </li>
          ))}
        </ul>
        <div className="sr-facts-notes">
          <p>{RULES.highlights[1]}</p>
          <p>{RULES.highlights[3]}</p>
        </div>
      </section>

      <div className="sr-chips" role="navigation" aria-label="Jump to a section">
        <div ref={chipsRef} className="sr-chips-row">
          {sections.map((section, k) => (
            <button
              key={section.heading}
              ref={(el) => {
                chipRefs.current[k] = el
              }}
              type="button"
              className={`sr-chip${active === k ? ' is-active' : ''}`}
              aria-current={active === k ? 'true' : undefined}
              onClick={() => goTo(k)}
            >
              <span className="sr-chip-n">{k + 1}</span>
              {cleanTitle(section.heading)}
            </button>
          ))}
        </div>
      </div>

      <div className="sr-layout">
        <aside className="sr-side">
          <nav aria-label="Sections">
            <p className="sr-side-title">On this page</p>
            <ol className="sr-toc">
              {sections.map((section, k) => (
                <li key={section.heading}>
                  <button
                    type="button"
                    className={`sr-toc-btn${active === k ? ' is-active' : ''}`}
                    aria-current={active === k ? 'true' : undefined}
                    onClick={() => goTo(k)}
                  >
                    <span className="sr-toc-n">{k + 1}</span>
                    <span>{cleanTitle(section.heading)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <main className="sr-main">
          <div className="sr-toolbar">
            <p className="sr-count">{sections.length} sections</p>
            <button type="button" className="sr-toggle-all" onClick={toggleAll}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          <div className="sr-list">
            {sections.map((section, k) => {
              const isOpen = open.has(k)
              return (
                <section
                  key={section.heading}
                  id={`sr-section-${k + 1}`}
                  ref={(el) => {
                    sectionRefs.current[k] = el
                  }}
                  className={`sr-item${isOpen ? ' is-open' : ''}`}
                >
                  <h2 className="sr-item-h">
                    <button
                      type="button"
                      className="sr-item-btn"
                      aria-expanded={isOpen}
                      aria-controls={`sr-panel-${k + 1}`}
                      id={`sr-head-${k + 1}`}
                      onClick={() => toggle(k)}
                    >
                      <span className="sr-badge">
                        <Icon name={ICON_KEYS[k]} size={20} />
                      </span>
                      <span className="sr-item-text">
                        <span className="sr-item-num">Section {k + 1}</span>
                        <span className="sr-item-title">{cleanTitle(section.heading)}</span>
                      </span>
                      <span className="sr-chevron">
                        <Icon name="chevron" size={20} />
                      </span>
                    </button>
                  </h2>
                  <div
                    className="sr-panel"
                    id={`sr-panel-${k + 1}`}
                    role="region"
                    aria-labelledby={`sr-head-${k + 1}`}
                  >
                    <div className="sr-panel-clip">
                      <div className="sr-panel-body">
                        <Body section={section} index={k} />
                      </div>
                    </div>
                  </div>
                </section>
              )
            })}
          </div>

          <section className="sr-cta">
            <div>
              <h2 className="sr-cta-title">Ready to apply?</h2>
              <p className="sr-cta-text">
                Have your ID, proof of address and examples of your work ready. We review every application.
              </p>
            </div>
            <div className="sr-cta-actions">
              <Link to={APPLY_PATH} className="sr-btn">
                Apply to sell on Zolara
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="sr-mail">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

const STYLES = `
.sr {
  --emerald: #0B3D2E;
  --emerald-2: #145340;
  --gold: #C9A24B;
  --gold-deep: #A67C2E;
  --cream: #FAF6EE;
  --cream-2: #F3ECDC;
  --ink: #2B2B2B;
  --muted: #5C5A50;
  --line: #E6DDC8;
  --red: #8C2F2F;
  --red-bg: #FBEFEC;
  background: var(--cream);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.65;
  min-height: 100vh;
  overflow-x: clip;
}
.sr *, .sr *::before, .sr *::after { box-sizing: border-box; }
.sr button { font: inherit; color: inherit; }
.sr a:focus-visible,
.sr button:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 2px;
}

.sr-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
  background: transparent;
}
.sr-progress-bar {
  height: 100%;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: left;
}

.sr-hero {
  background: var(--emerald);
  color: var(--cream);
  border-bottom: 4px solid var(--gold);
  padding: 56px 20px 112px;
}
.sr-hero-inner { max-width: 1120px; margin: 0 auto; }
.sr-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: clamp(2.1rem, 6vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
}
.sr-intro {
  max-width: 62ch;
  margin: 0;
  font-size: 1.05rem;
  color: #E4EBE6;
}

.sr-facts-wrap {
  max-width: 1120px;
  margin: -72px auto 0;
  padding: 0 20px;
  position: relative;
}
.sr-facts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.sr-fact {
  background: #fff;
  border: 1px solid var(--line);
  border-top: 4px solid var(--gold);
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 10px 24px -16px rgba(11, 61, 46, 0.45);
}
.sr-fact-value {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: clamp(1.15rem, 4.4vw, 1.6rem);
  line-height: 1.15;
  color: var(--emerald);
}
.sr-fact-label { font-size: 0.9rem; color: var(--muted); line-height: 1.4; }
.sr-facts-notes {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  font-size: 0.92rem;
  color: var(--muted);
}
.sr-facts-notes p {
  margin: 0;
  padding-left: 14px;
  border-left: 3px solid var(--gold);
}

.sr-chips {
  position: sticky;
  top: var(--sr-nav);
  z-index: 30;
  margin-top: 24px;
  background: rgba(250, 246, 238, 0.96);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.sr-chips-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 20px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.sr-chips-row::-webkit-scrollbar { display: none; }
.sr-chip {
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
.sr-chip-n {
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
.sr-chip.is-active {
  background: var(--emerald);
  border-color: var(--emerald);
  color: var(--cream);
}
.sr-chip.is-active .sr-chip-n { background: var(--gold); color: var(--emerald); }

.sr-layout {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 72px;
  display: block;
}
.sr-side { display: none; }

.sr-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sr-count { margin: 0; color: var(--muted); font-size: 0.92rem; }
.sr-toggle-all {
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
.sr-toggle-all:hover { background: var(--emerald); color: var(--cream); }

.sr-list { display: grid; gap: 12px; }
.sr-item {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  scroll-margin-top: calc(var(--sr-nav) + 76px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.sr-item.is-open {
  border-color: var(--gold);
  box-shadow: 0 14px 30px -22px rgba(11, 61, 46, 0.5);
}
.sr-item-h { margin: 0; font-size: inherit; }
.sr-item-btn {
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
.sr-badge {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--emerald);
  color: var(--gold);
}
.sr-item.is-open .sr-badge { background: var(--gold); color: var(--emerald); }
.sr-item-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.sr-item-num { font-size: 0.8rem; color: var(--muted); line-height: 1.3; }
.sr-item-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: 1.08rem;
  line-height: 1.3;
  color: var(--emerald);
}
.sr-chevron {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--emerald);
  transition: transform 0.25s ease;
}
.sr-item.is-open .sr-chevron { transform: rotate(180deg); }

.sr-panel {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition: grid-template-rows 0.28s ease, visibility 0s linear 0.28s;
}
.sr-item.is-open .sr-panel {
  grid-template-rows: 1fr;
  visibility: visible;
  transition: grid-template-rows 0.28s ease, visibility 0s linear 0s;
}
.sr-panel-clip { overflow: hidden; min-height: 0; }
.sr-panel-body { padding: 4px 18px 22px; }
.sr-p { margin: 0 0 14px; max-width: 68ch; }
.sr-p:last-child { margin-bottom: 0; }

.sr-dotlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
  max-width: 68ch;
}
.sr-dotlist li { position: relative; padding-left: 22px; }
.sr-dotlist li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.62em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
}

.sr-iconlist {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}
.sr-iconlist li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--cream);
  border: 1px solid var(--line);
}
.sr-mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
}
.sr-iconlist--yes .sr-mark { background: var(--emerald); color: var(--gold); }
.sr-iconlist--no li { background: var(--red-bg); border-color: #EBCFC8; }
.sr-iconlist--no .sr-mark { background: var(--red); color: #fff; }

.sr-note {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  border-left: 4px solid var(--gold);
  background: var(--cream-2);
  max-width: 68ch;
}
.sr-note--red { border-left-color: var(--red); background: var(--red-bg); }

.sr-timeline {
  list-style: none;
  margin: 8px 0 22px;
  padding: 0;
  display: grid;
  gap: 0;
}
.sr-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 36px 1fr;
  column-gap: 14px;
  padding-bottom: 18px;
}
.sr-timeline li:last-child { padding-bottom: 0; }
.sr-timeline li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 17px;
  top: 36px;
  bottom: 0;
  width: 2px;
  background: var(--gold);
}
.sr-timeline-n {
  grid-row: 1 / span 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--emerald);
  color: var(--cream);
  font-weight: 700;
  font-size: 0.9rem;
}
.sr-timeline-t { font-weight: 700; color: var(--emerald); line-height: 1.3; align-self: end; }
.sr-timeline-d { color: var(--muted); font-size: 0.92rem; line-height: 1.4; }

.sr-options {
  list-style: none;
  margin: 14px 0 18px;
  padding: 0;
  display: grid;
  gap: 10px;
}
.sr-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-top: 4px solid var(--gold);
}
.sr-option-t {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  color: var(--emerald);
}
.sr-option-d { font-size: 0.95rem; }

.sr-strikes {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.sr-strike {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  border-top: 5px solid var(--gold);
  background: var(--cream);
  border-left: 1px solid var(--line);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.sr-strike--2 { border-top-color: var(--gold-deep); }
.sr-strike--3 { border-top-color: var(--red); background: var(--red-bg); }
.sr-strike-label {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--emerald);
}
.sr-strike--3 .sr-strike-label { color: var(--red); }
.sr-strike-text { font-size: 0.95rem; }

.sr-cta {
  margin-top: 28px;
  padding: 28px 22px;
  border-radius: 18px;
  background: var(--emerald);
  color: var(--cream);
  border-bottom: 4px solid var(--gold);
  display: grid;
  gap: 20px;
}
.sr-cta-title {
  margin: 0 0 6px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.6rem;
  line-height: 1.2;
}
.sr-cta-text { margin: 0; max-width: 52ch; color: #E4EBE6; }
.sr-cta-actions { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.sr-btn {
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
  transition: background 0.2s ease;
}
.sr-btn:hover { background: #D9B665; }
.sr-mail { color: var(--cream); text-underline-offset: 3px; overflow-wrap: anywhere; }
.sr-cta .sr-btn:focus-visible,
.sr-cta .sr-mail:focus-visible { outline-color: var(--cream); }

@media (min-width: 640px) {
  .sr-hero { padding: 72px 32px 128px; }
  .sr-facts-wrap { padding: 0 32px; }
  .sr-facts { grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .sr-facts-notes { grid-template-columns: 1fr 1fr; gap: 20px; }
  .sr-chips-row { padding: 10px 32px; }
  .sr-layout { padding: 28px 32px 88px; }
  .sr-iconlist { grid-template-columns: 1fr 1fr; }
  .sr-strikes { grid-template-columns: repeat(3, 1fr); }
  .sr-options { grid-template-columns: repeat(3, 1fr); }
  .sr-panel-body { padding: 4px 24px 26px 24px; }
  .sr-item-btn { padding: 16px 22px; }
}

@media (min-width: 720px) {
  .sr-timeline { grid-template-columns: repeat(6, 1fr); gap: 8px; }
  .sr-timeline li {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    row-gap: 6px;
    padding-bottom: 0;
  }
  .sr-timeline li:not(:last-child)::after {
    left: calc(50% + 24px);
    right: calc(-50% + 24px);
    top: 17px;
    bottom: auto;
    width: auto;
    height: 2px;
  }
  .sr-timeline-n { grid-row: auto; }
  .sr-timeline-t { align-self: auto; }
}

@media (min-width: 960px) {
  .sr-chips { display: none; }
  .sr-layout {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 40px;
    padding-top: 40px;
  }
  .sr-side {
    display: block;
    position: sticky;
    top: calc(var(--sr-nav) + 20px);
    align-self: start;
    max-height: calc(100vh - var(--sr-nav) - 40px);
    overflow-y: auto;
  }
  .sr-item { scroll-margin-top: calc(var(--sr-nav) + 20px); }
  .sr-side-title {
    margin: 0 0 10px;
    font-weight: 700;
    color: var(--emerald);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
  }
  .sr-toc { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; border-left: 2px solid var(--line); }
  .sr-toc-btn {
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
  .sr-toc-btn:hover { color: var(--emerald); background: var(--cream-2); }
  .sr-toc-btn.is-active {
    color: var(--emerald);
    font-weight: 700;
    border-left-color: var(--gold);
    background: var(--cream-2);
  }
  .sr-toc-n { flex: 0 0 auto; min-width: 1.4em; font-variant-numeric: tabular-nums; color: var(--gold-deep); font-weight: 700; }
  .sr-cta { grid-template-columns: 1fr auto; align-items: center; padding: 32px 36px; }
  .sr-cta-actions { align-items: flex-end; }
}

@media (prefers-reduced-motion: reduce) {
  .sr-panel,
  .sr-item.is-open .sr-panel,
  .sr-chevron,
  .sr-item,
  .sr-btn { transition: none; }
  .sr-chips-row { scroll-behavior: auto; }
}
`