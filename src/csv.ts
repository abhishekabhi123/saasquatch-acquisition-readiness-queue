import Papa from 'papaparse'
import type { Lead, ScoredLead } from './types'

const toNumber = (value: string) => {
  const parsed = Number(String(value).replace(/[$,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseLeadCsv(text: string): Lead[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })
  if (result.errors.length) throw new Error(result.errors[0].message)
  return result.data.filter((row) => row.company?.trim()).map((row, index) => ({
    id: `import-${Date.now()}-${index}`,
    company: row.company.trim(),
    website: row.website?.trim() ?? '',
    industry: row.industry?.trim() ?? '',
    location: row.location?.trim() ?? '',
    revenue: toNumber(row.revenue),
    employees: toNumber(row.employees),
    contactName: row.contactName?.trim() || null,
    contactTitle: row.contactTitle?.trim() || null,
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    lastUpdated: row.lastUpdated?.trim() || null,
    inQueue: false,
  }))
}

export function mergeImportedLeads(current: Lead[], incoming: Lead[]) {
  const next = [...current]
  incoming.forEach((lead) => {
    const key = lead.website.trim().toLowerCase()
    const existingIndex = key ? next.findIndex((item) => item.website.trim().toLowerCase() === key) : -1
    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      next[existingIndex] = { ...lead, id: existing.id, inQueue: existing.inQueue }
    } else {
      next.push(lead)
    }
  })
  return next
}

export function queueExportRows(leads: ScoredLead[]) {
  return [
    ['Company', 'Website', 'Industry', 'Location', 'Revenue', 'Employees', 'Score', 'Action', 'Contact', 'Title', 'Email', 'Phone', 'Flags'],
    ...leads.map((lead) => [
      lead.company, lead.website, lead.industry, lead.location, lead.revenue ?? '', lead.employees ?? '',
      lead.score, lead.status, lead.contactName ?? '', lead.contactTitle ?? '', lead.email ?? '', lead.phone ?? '', lead.flags.join('; '),
    ]),
  ]
}

export function crmExportRows(leads: ScoredLead[]) {
  return [
    ['Name', 'Company', 'Job Title', 'Email', 'Phone Number', 'Website URL', 'City', 'Country', 'Industry', 'Lead Status', 'Notes'],
    ...leads.map((lead) => {
      const [city, country] = lead.location.split(',').map((part) => part.trim())
      return [
        lead.contactName ?? '', lead.company, lead.contactTitle ?? '', lead.email ?? '', lead.phone ?? '',
        lead.website, city ?? '', country ?? city ?? '', lead.industry, lead.status,
        `Score ${lead.score}. ${lead.flags.join('; ') || 'No quality flags.'}`,
      ]
    }),
  ]
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const url = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
