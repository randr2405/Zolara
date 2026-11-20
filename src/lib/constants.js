export const CATALOG = [
  {
    name: 'Automotive',
    subs: [
      { name: 'Car parts', type: 'product' },
      { name: 'Tyres & wheels', type: 'product' },
      { name: 'Car accessories', type: 'product' },
      { name: 'Servicing & repairs', type: 'service' },
      { name: 'Panel beating & spray painting', type: 'service' },
      { name: 'Car wash & detailing', type: 'service' },
      { name: 'Towing & roadside help', type: 'service' },
    ],
  },
  {
    name: 'Beauty & Hair',
    subs: [
      { name: 'Skincare', type: 'product' },
      { name: 'Hair products', type: 'product' },
      { name: 'Makeup & cosmetics', type: 'product' },
      { name: 'Fragrances', type: 'product' },
      { name: 'Nails', type: 'service' },
      { name: 'Hair styling', type: 'service' },
      { name: 'Barber', type: 'service' },
      { name: 'Makeup artist', type: 'service' },
      { name: 'Lashes & brows', type: 'service' },
      { name: 'Massage & spa', type: 'service' },
    ],
  },
  {
    name: 'Clothing',
    subs: [
      { name: 'Clothing brands & labels', type: 'product' },
      { name: 'Designer clothing', type: 'product' },
      { name: 'Second-hand designer', type: 'product' },
      { name: 'Vintage designer', type: 'product' },
      { name: 'Uniforms & workwear', type: 'product' },
      { name: 'Tailoring & alterations', type: 'service' },
    ],
  },
  {
    name: 'Food & Drink',
    subs: [
      { name: 'Baked goods', type: 'product' },
      { name: 'Fresh produce', type: 'product' },
      { name: 'Meat & braai', type: 'product' },
      { name: 'Snacks & sweets', type: 'product' },
      { name: 'Drinks', type: 'product' },
      { name: 'Catering', type: 'service' },
      { name: 'Private chef', type: 'service' },
    ],
  },
  {
    name: 'Home & Living',
    subs: [
      { name: 'Furniture', type: 'product' },
      { name: 'Décor', type: 'product' },
      { name: 'Kitchenware', type: 'product' },
      { name: 'Plants & garden', type: 'product' },
      { name: 'Cleaning', type: 'service' },
      { name: 'Plumbing', type: 'service' },
      { name: 'Electrical', type: 'service' },
      { name: 'Painting & renovations', type: 'service' },
      { name: 'Gardening', type: 'service' },
      { name: 'Moving & delivery', type: 'service' },
    ],
  },
  {
    name: 'Electronics',
    subs: [
      { name: 'Phones & accessories', type: 'product' },
      { name: 'Audio & TV', type: 'product' },
      { name: 'Computers & laptops', type: 'product' },
      { name: 'Appliances', type: 'product' },
      { name: 'Appliance repairs', type: 'service' },
    ],
  },
  {
    name: 'IT & Digital Services',
    subs: [
      { name: 'Website design & development', type: 'service' },
      { name: 'App development', type: 'service' },
      { name: 'Hosting & domains', type: 'service' },
      { name: 'Integrations & systems', type: 'service' },
      { name: 'IT support & maintenance', type: 'service' },
      { name: 'Networking & CCTV', type: 'service' },
      { name: 'Digital marketing', type: 'service' },
    ],
  },
  {
    name: 'Printing, Embroidery & Branding',
    subs: [
      { name: 'Promotional products', type: 'product' },
      { name: 'Printing', type: 'service' },
      { name: 'Embroidery', type: 'service' },
      { name: 'Custom clothing & merchandise', type: 'service' },
      { name: 'Signage & large format', type: 'service' },
      { name: 'Logo & brand design', type: 'service' },
    ],
  },
  {
    name: 'Events',
    subs: [
      { name: 'Event décor & hire', type: 'service' },
      { name: 'DJs & entertainment', type: 'service' },
      { name: 'Venues', type: 'service' },
      { name: 'Event planning', type: 'service' },
    ],
  },
  {
    name: 'Photography & Video',
    subs: [
      { name: 'Photography', type: 'service' },
      { name: 'Videography', type: 'service' },
    ],
  },
  {
    name: 'Gifts',
    subs: [
      { name: 'Hampers', type: 'product' },
      { name: 'Flowers', type: 'product' },
      { name: 'Handmade crafts', type: 'product' },
    ],
  },
  {
    name: 'Education',
    subs: [
      { name: 'Tutoring', type: 'service' },
      { name: 'Music lessons', type: 'service' },
      { name: 'Driving lessons', type: 'service' },
    ],
  },
  {
    name: 'Pets',
    subs: [
      { name: 'Pet food & supplies', type: 'product' },
      { name: 'Pet grooming', type: 'service' },
      { name: 'Dog training', type: 'service' },
      { name: 'Pet sitting', type: 'service' },
    ],
  },
  {
    name: 'Other',
    subs: [
      { name: 'Other products', type: 'product' },
      { name: 'Other services', type: 'service' },
    ],
  },
]

export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
]

export const PREFERRED_LABEL = 'Founder & preferred supplier'

export const mainCategories = (type) =>
  CATALOG.filter((c) => type === 'all' || c.subs.some((s) => s.type === type)).map((c) => c.name)

export const subCategories = (main, type) => {
  const cat = CATALOG.find((c) => c.name === main)
  if (!cat) return []
  return [...new Set(cat.subs.filter((s) => type === 'all' || s.type === type).map((s) => s.name))]
}

export const categoryNote = (main) => CATALOG.find((c) => c.name === main)?.note

export const formatZAR = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format((cents || 0) / 100)