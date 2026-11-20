import LegalPage from '../components/LegalPage.jsx'
import { BAN_MONTHS, STRIKE_LIMIT, STRIKE_WINDOW_DAYS } from '../lib/strikes.js'
import { OWNER } from '../lib/legal.js'

const MONTHLY_FEE = 'R250'
const FREE_MONTHS = 3

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
        'Customers send you a request. Accept or decline it as soon as you can. Customers cannot pay until you accept.',
        'Accepting an order takes the quantity off your stock. If you cancel an accepted order that has not been paid, the stock is returned.',
        'Once the customer has paid through PayFast, you will be emailed and can go ahead. You may only mark an order shipped or a booking completed after the customer has paid.',
        'A paid order or booking cannot be cancelled by you on Zolara. Please contact the Zolara team if there is a problem.',
        'Mark orders as shipped and delivered, and bookings as completed, promptly and honestly. A sale counts towards your balance only after that.',
      ],
    },
    {
      heading: '7. Refunds',
      bullets: [
        'A customer can ask Zolara for a refund on a paid order or booking. Zolara reviews each request.',
        'While a refund request is open, do not ship the order or mark the booking completed until Zolara has decided.',
        'If a refund is approved, the sale no longer counts towards your balance, and we will contact you if it affects a payout.',
      ],
    },
    {
      heading: '8. Customer details',
      paras: [
        'You will see customers’ names, emails, phone numbers and addresses so you can fulfil their order or booking. Use them only for that purpose, and never share them or use them for anything else.',
      ],
    },
    {
      heading: '9. Customer feedback and complaints',
      paras: [
        'After a service is completed or an order is delivered, customers can tell us whether they were satisfied. We take service seriously, and we read every complaint. A satisfaction score appears on your profile once you have enough reviews.',
      ],
    },
    {
      heading: '10. Warnings and removal',
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
      heading: '11. Fair play',
      paras: [
        `Zolara is owned by ${OWNER}. R&R Site Solutions, a division of ${OWNER}, also sells on Zolara as its founding supplier and a preferred supplier, and its listings may be shown first and marked as such. It competes with other suppliers on the same terms as everyone else. Zolara uses administrator access to bookings, orders and supplier details only to run the marketplace, and not for the benefit of any supplier.`,
      ],
    },
    {
      heading: '12. Fees and payouts',
      bullets: [
        `Your first ${FREE_MONTHS} months after approval are free. After that, the supplier access fee is ${MONTHLY_FEE} per month, deducted from your balance.`,
        'Zolara takes no commission on your sales.',
        'PayFast, our payment provider, charges a processing fee on every customer payment. The fee depends on how the customer pays, for example by card or Instant EFT. We deduct the exact fee PayFast charged from what we pay you for that sale, and it shows on your Payments page.',
        'Zolara pays your earnings every two weeks into the bank account you give us, after PayFast fees, your subscription and any other amount you owe are deducted. Keep your banking details accurate. We may delay a payout while we confirm a change to them.',
      ],
    },
    {
      heading: '13. Your responsibilities',
      paras: [
        'You are responsible for your own taxes, licences, insurance and compliance with the law, including the Consumer Protection Act 68 of 2008 in the way you sell.',
      ],
    },
    {
      heading: '14. Zolara’s role',
      paras: [
        'Zolara is a marketplace that connects customers with independent suppliers. Suppliers, not Zolara, provide the products and services listed and are responsible for delivery, timing and quality. To the extent the law allows, Zolara is not responsible for delays or problems with a supplier’s products or services, including where a supplier does not deliver. Nothing in these rules limits any rights a customer has under South African law.',
      ],
    },
  ],
}

export default function SupplierRules() {
  return <LegalPage doc={RULES} />
}