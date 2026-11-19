const COLORS = {
  emerald: 'FF0B3D2E',
  gold: 'FFC9A24B',
  deepGold: 'FFA67C2E',
  cream: 'FFFAF6EE',
  charcoal: 'FF2B2B2B',
}

const FORMATS = {
  cents: '"R" #,##0.00;[Red]-"R" #,##0.00',
  number: '#,##0',
  date: 'dd mmm yyyy',
  datetime: 'dd mmm yyyy hh:mm',
}

const THIN = { style: 'thin', color: { argb: 'FFE6D9B8' } }
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const HEADER_ROW = 4
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const isNumeric = (type) => type === 'cents' || type === 'number'

export function stampDate() {
  return new Date().toISOString().slice(0, 10)
}

export function toDate(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function cellValue(type, v) {
  if (v === undefined || v === null || v === '') return null
  if (type === 'cents') return Number(v) / 100
  if (type === 'date' || type === 'datetime') return toDate(v)
  if (type === 'number') return Number(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function safeName(name) {
  return String(name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
}

function addSheet(wb, spec) {
  const { name, title, subtitle, columns, rows } = spec
  const last = columns.length
  const ws = wb.addWorksheet(safeName(name), {
    properties: { tabColor: { argb: COLORS.gold } },
    views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width || 16 }))

  const titleRow = ws.addRow([title])
  titleRow.height = 30
  for (let c = 1; c <= last; c += 1) {
    const cell = ws.getCell(1, c)
    cell.fill = solid(COLORS.emerald)
    cell.font = { size: 16, bold: true, color: { argb: COLORS.cream } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  }

  const subRow = ws.addRow([subtitle || `Generated ${new Date().toLocaleDateString('en-ZA')}`])
  subRow.height = 20
  for (let c = 1; c <= last; c += 1) {
    const cell = ws.getCell(2, c)
    cell.fill = solid(COLORS.cream)
    cell.font = { size: 10, italic: true, color: { argb: COLORS.deepGold } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  }

  ws.addRow([])
  if (last > 1) {
    ws.mergeCells(1, 1, 1, last)
    ws.mergeCells(2, 1, 2, last)
  }

  const head = ws.addRow(columns.map((c) => c.header))
  head.height = 24
  head.eachCell((cell, n) => {
    cell.fill = solid(COLORS.emerald)
    cell.font = { bold: true, color: { argb: COLORS.cream } }
    cell.border = BORDER
    cell.alignment = {
      vertical: 'middle',
      horizontal: isNumeric(columns[n - 1].type) ? 'right' : 'left',
      wrapText: true,
    }
  })

  if (rows.length === 0) {
    const empty = ws.addRow(['No records'])
    empty.getCell(1).font = { italic: true, color: { argb: COLORS.charcoal } }
  }

  rows.forEach((row, i) => {
    const r = ws.addRow(columns.map((c) => cellValue(c.type, row[c.key])))
    r.eachCell({ includeEmpty: true }, (cell, n) => {
      const c = columns[n - 1]
      if (!c) return
      cell.border = BORDER
      cell.font = { color: { argb: COLORS.charcoal } }
      cell.alignment = {
        vertical: 'top',
        horizontal: isNumeric(c.type) ? 'right' : 'left',
        wrapText: !isNumeric(c.type),
      }
      if (FORMATS[c.type]) cell.numFmt = FORMATS[c.type]
      if (i % 2 === 1) cell.fill = solid(COLORS.cream)
    })
  })

  if (rows.length && columns.some((c) => c.total)) {
    const firstData = HEADER_ROW + 1
    const lastData = HEADER_ROW + rows.length
    const totals = ws.addRow(
      columns.map((c, i) => {
        if (i === 0) return 'Total'
        if (!c.total) return null
        const letter = ws.getColumn(i + 1).letter
        const result = rows.reduce((t, row) => t + (Number(cellValue(c.type, row[c.key])) || 0), 0)
        return { formula: `SUM(${letter}${firstData}:${letter}${lastData})`, result }
      })
    )
    totals.height = 22
    totals.eachCell({ includeEmpty: true }, (cell, n) => {
      const c = columns[n - 1]
      if (!c) return
      cell.fill = solid(COLORS.gold)
      cell.font = { bold: true, color: { argb: COLORS.emerald } }
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: isNumeric(c.type) ? 'right' : 'left' }
      if (FORMATS[c.type]) cell.numFmt = FORMATS[c.type]
    })
  }

  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: last },
  }
  ws.headerFooter.oddFooter = '&LZolara&RPage &P of &N'
}

export async function downloadWorkbook(filename, sheets) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Zolara'
  wb.created = new Date()
  sheets.forEach((s) => addSheet(wb, s))
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_TYPE }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const STATUS_SUMMARY_COLUMNS = [
  { header: 'Status', key: 'status', width: 28 },
  { header: 'Count', key: 'count', type: 'number', width: 12, total: true },
  { header: 'Value', key: 'value', type: 'cents', width: 20 },
]

export function summaryByStatus(items, labels, centsOf) {
  return Object.keys(labels).map((status) => {
    const mine = items.filter((x) => x.status === status)
    return {
      status: labels[status],
      count: mine.length,
      value: mine.reduce((t, x) => t + centsOf(x), 0),
    }
  })
}

const SECTIONS = [
  ['account', 'Account'],
  ['sellerProfile', 'Supplier profile'],
  ['application', 'Application'],
  ['bankingDetails', 'Banking details'],
  ['supplierDecision', 'Supplier decision'],
  ['listings', 'Listings'],
  ['bookingsAsCustomer', 'Bookings (customer)'],
  ['bookingsAsSupplier', 'Bookings (supplier)'],
  ['ordersAsCustomer', 'Orders (customer)'],
  ['ordersAsSupplier', 'Orders (supplier)'],
  ['feedbackGiven', 'Feedback given'],
  ['feedbackReceived', 'Feedback received'],
  ['statement', 'Statement'],
]

function pretty(key) {
  const isCents = /Cents$/.test(key)
  const base = key
    .replace(/Cents$/, '')
    .split('.')
    .join(' › ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
  const text = base.charAt(0).toUpperCase() + base.slice(1)
  return isCents ? `${text} (R)` : text
}

function flatten(obj, prefix = '', out = {}) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else if (Array.isArray(v)) {
      out[key] = v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : x)).join(', ')
    } else out[key] = v
  })
  return out
}

function inferColumns(rows) {
  const keys = []
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k)) keys.push(k) }))
  return keys.map((key) => {
    const values = rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null && v !== '')
    let type = 'text'
    if (/Cents$/.test(key) && values.every((v) => typeof v === 'number')) type = 'cents'
    else if (values.length && values.every((v) => typeof v === 'string' && ISO.test(v))) type = 'datetime'
    else if (values.length && values.every((v) => typeof v === 'number')) type = 'number'
    const longest = values.reduce((m, v) => Math.max(m, String(v).length), pretty(key).length)
    const width = type === 'text' ? Math.min(Math.max(longest + 2, 14), 50) : type === 'datetime' ? 20 : 16
    return { header: pretty(key), key, type, width }
  })
}

function pairValue(key, v) {
  if (typeof v === 'string' && ISO.test(v)) return new Date(v).toLocaleString('en-ZA')
  if (/Cents$/.test(key) && typeof v === 'number') return `R ${(v / 100).toFixed(2)}`
  return v
}

export async function exportDataWorkbook(data, filename) {
  const exported = toDate(data.exportedAt)
  const summary = [
    { item: 'Exported', detail: exported ? exported.toLocaleString('en-ZA') : '' },
    { item: 'User id', detail: data.userId },
    ...SECTIONS.map(([key, label]) => {
      const v = data[key]
      if (Array.isArray(v)) return { item: label, detail: `${v.length} record${v.length === 1 ? '' : 's'}` }
      return { item: label, detail: v ? 'On file' : 'None' }
    }),
  ]

  const sheets = [
    {
      name: 'Summary',
      title: 'Zolara · Personal data export',
      subtitle: 'Contains personal and banking information. Share securely, and only with the verified account holder.',
      columns: [
        { header: 'Item', key: 'item', width: 28 },
        { header: 'Detail', key: 'detail', width: 44 },
      ],
      rows: summary,
    },
  ]

  SECTIONS.forEach(([key, label]) => {
    const v = data[key]
    if (Array.isArray(v)) {
      if (v.length === 0) return
      const rows = v.map((r) => flatten(r))
      sheets.push({
        name: label,
        title: `Zolara · ${label}`,
        subtitle: `User ${data.userId}`,
        columns: inferColumns(rows),
        rows,
      })
    } else if (v) {
      const flat = flatten(v)
      sheets.push({
        name: label,
        title: `Zolara · ${label}`,
        subtitle: `User ${data.userId}`,
        columns: [
          { header: 'Field', key: 'field', width: 30 },
          { header: 'Value', key: 'value', width: 60 },
        ],
        rows: Object.entries(flat).map(([k, val]) => ({ field: pretty(k), value: pairValue(k, val) })),
      })
    }
  })

  await downloadWorkbook(filename, sheets)
}