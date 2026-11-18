import { RESTRICTED_NOTE } from '../lib/constants.js'

// ---- Edit these before launch ----
const SHOW_DRAFT_BANNER = true // set to false once a lawyer has reviewed the wording
const STRIKE_LIMIT = 3         // complaints before removal (placeholder, confirm)
const STRIKE_WINDOW_DAYS = 90  // within this many days (placeholder, confirm)
const BAN_MONTHS = 6           // months before a removed supplier may reapply (placeholder, confirm)
const MONTHLY_FEE = 'R250'
const FREE_MONTHS = 3
// ----------------------------------

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-semibold text-emerald-brand">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export default function SupplierRules() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      {SHOW_DRAFT_BANNER && (
        <p className="mb-6 rounded-lg border border-gold-deep bg-white p-3 text-xs text-gold-deep">
          Draft: these rules are being finalised and will be reviewed before Zolara launches.
        </p>
      )}

      <h1 className="mb-1 text-3xl font-semibold text-emerald-brand">Supplier rules</h1>
      <p className="mb-8 text-sm text-gold-deep">
        How to join Zolara, what we expect, and what happens if standards slip.
      </p>

      <Section title="Why we are careful about who joins">
        <p>
          Zolara is a calm, trusted place to buy and book from local South Africans. We take
          onboarding seriously, with real care for the public who spend on Zolara. Every supplier
          is reviewed so that the products and services we list are of good quality, and so that
          customers can shop and book with confidence.
        </p>
      </Section>

      <Section title="Who can sell on Zolara">
        <p>
          We accept serious, reliable South African businesses and individuals who can deliver what
          they list. Before we approve you, we ask for:
        </p>
        <ul className="ml-5 list-disc">
          <li>A copy of your ID</li>
          <li>Business registration documents, if you are a registered business</li>
          <li>Proof of address</li>
          <li>Examples of your work or products</li>
          <li>References from customers or other businesses</li>
        </ul>
        <p>Approval is at our discretion.</p>
      </Section>

      <Section title="What we do not list">
        <p>{RESTRICTED_NOTE}</p>
        <p>
          Clothing is limited to resold designer labels and second-hand or vintage designer pieces.
          Your own clothing brand or label cannot be listed. Listings that do not follow these rules
          will be removed.
        </p>
      </Section>

      <Section title="Quality standards">
        <ul className="ml-5 list-disc">
          <li>Describe what you offer honestly, with clear photos and accurate prices.</li>
          <li>Only list stock you have, and keep stock levels and availability up to date.</li>
          <li>Deliver products and complete services on the time and terms you promise.</li>
          <li>Answer customer messages and questions promptly and politely.</li>
        </ul>
      </Section>

      <Section title="Customer feedback and complaints">
        <p>
          After a service is completed, customers can tell us whether they were satisfied. We take
          service seriously, and we read every complaint.
        </p>
      </Section>

      <Section title="Warnings and removal">
        <p>
          We review each complaint before it counts, and suppliers can respond to a complaint before
          a decision is made. Valid complaints are handled in steps, counted over a rolling{' '}
          {STRIKE_WINDOW_DAYS} days:
        </p>
        <ul className="ml-5 list-disc">
          <li>Complaint 1: a written warning.</li>
          <li>Complaint 2: a final warning.</li>
          <li>
            Complaint {STRIKE_LIMIT}: removal from the Zolara supplier database. A removed
            supplier must wait {BAN_MONTHS} months before applying to join again.
          </li>
        </ul>
        <p>Serious misconduct, such as fraud, can lead to immediate removal.</p>
      </Section>

      <Section title="Zolara’s role">
        <p>
          Zolara is a marketplace that connects customers with independent suppliers. Suppliers,
          not Zolara, provide the products and services listed and are responsible for delivery,
          timing and quality. To the extent the law allows, Zolara is not responsible for delays or
          problems with a supplier’s products or services, including where a supplier does not
          deliver. Nothing in these rules limits any rights a customer has under South African law.
        </p>
      </Section>

      <Section title="Fees">
        <ul className="ml-5 list-disc">
          <li>
            Your first {FREE_MONTHS} months after approval are free. After that, the supplier access
            fee is {MONTHLY_FEE} per month.
          </li>
          <li>Zolara takes no commission on your sales.</li>
          <li>
            Payment processing fees charged by our payment provider (PayFast) on each sale are for the
            supplier’s account.
          </li>
        </ul>
      </Section>
    </main>
  )
}