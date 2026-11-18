export const CATEGORIES = {
  product: ['Fashion', 'Beauty', 'Home & Living', 'Food & Drink', 'Electronics', 'Gifts', 'Other'],
  service: ['Cleaning', 'Beauty & Hair', 'Tutoring', 'Repairs & Maintenance', 'Events', 'Photography', 'Other'],
}

export const formatZAR = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format((cents || 0) / 100)