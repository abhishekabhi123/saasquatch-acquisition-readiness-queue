import type { Icp, Lead, ScoreFactor, ScoredLead } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OWNER_TITLES = /founder|co-founder|ceo|owner|president|principal|managing director|managing partner/i
const STALE_DAYS = 90

const normalize = (value: string) => value.trim().toLowerCase()
const domain = (website: string) => normalize(website).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]

export function isValidEmail(value: string | null) {
  return Boolean(value && EMAIL_PATTERN.test(value))
}

export function daysSince(value: string | null, today = new Date()) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.floor((today.getTime() - parsed.getTime()) / 86_400_000)
}

function rangePoints(value: number | null, min: number, max: number, full: number) {
  if (value === null) return 0
  if (value >= min && value <= max) return full
  const slack = (max - min) * 0.2
  const distance = value < min ? min - value : value - max
  if (distance <= slack) return Math.round(full * 0.5)
  return 0
}

function completeness(lead: Lead) {
  const fields = [lead.website, lead.industry, lead.location, lead.revenue, lead.employees, lead.contactName, lead.email, lead.phone]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

export function scoreLeads(leads: Lead[], icp: Icp, today = new Date()): ScoredLead[] {
  const domainCounts = new Map<string, number>()
  leads.forEach((lead) => {
    const key = domain(lead.website)
    if (!key) return
    domainCounts.set(key, (domainCounts.get(key) ?? 0) + 1)
  })

  return leads.map((lead) => {
    const industryMatch = icp.industries.some((industry) => normalize(industry) === normalize(lead.industry))
    const locationMatch = icp.locations.some((location) => normalize(lead.location).includes(normalize(location)))
    const revenuePoints = rangePoints(lead.revenue, icp.minRevenue, icp.maxRevenue, 25)
    const employeePoints = rangePoints(lead.employees, icp.minEmployees, icp.maxEmployees, 15)
    const ownerTitle = Boolean(lead.contactTitle && OWNER_TITLES.test(lead.contactTitle))
    const emailReady = isValidEmail(lead.email)
    const contactReady = Boolean(lead.contactName && (emailReady || lead.phone))
    const quality = completeness(lead)
    const age = daysSince(lead.lastUpdated, today)
    const stale = age !== null && age > STALE_DAYS
    const factors: ScoreFactor[] = [
      { label: 'Industry fit', points: industryMatch ? 25 : 0, max: 25, detail: industryMatch ? `${lead.industry} matches your ICP` : `${lead.industry} is outside your ICP` },
      { label: 'Revenue fit', points: revenuePoints, max: 25, detail: revenuePoints === 25 ? 'Within target revenue band' : revenuePoints ? 'Near the target revenue band' : 'Outside target revenue band' },
      { label: 'Location fit', points: locationMatch ? 15 : 0, max: 15, detail: locationMatch ? 'Within target geography' : 'Outside target geography' },
      { label: 'Team size', points: employeePoints, max: 15, detail: employeePoints === 15 ? 'Within target employee range' : employeePoints ? 'Near the target employee range' : 'Outside target employee range' },
      { label: 'Decision-maker', points: contactReady ? (ownerTitle ? 10 : 7) : 0, max: 10, detail: contactReady ? (ownerTitle ? 'Owner-level contact is reachable' : 'A contact exists, but title is not clearly owner-level') : 'No reachable decision-maker yet' },
      { label: 'Data quality', points: Math.round(quality / 10), max: 10, detail: `${quality}% profile completeness` },
    ]
    const isDuplicate = (domainCounts.get(domain(lead.website)) ?? 0) > 1
    const flags = [
      ...(isDuplicate ? ['Duplicate domain'] : []),
      ...(!lead.email ? ['No email on file'] : !emailReady ? ['Email format looks invalid'] : []),
      ...(!lead.contactName ? ['No decision-maker identified'] : []),
      ...(!ownerTitle && lead.contactTitle ? ['Contact may not be the owner'] : []),
      ...(quality < 70 ? ['Incomplete profile'] : []),
      ...(stale ? ['Profile older than 90 days'] : []),
    ]
    const rawScore = factors.reduce((total, factor) => total + factor.points, 0)
    const score = Math.max(0, rawScore - (isDuplicate ? 20 : 0) - (stale ? 5 : 0))
    const status: ScoredLead['status'] = isDuplicate || score < 45
      ? 'Deprioritize'
      : !contactReady
        ? 'Enrich first'
        : stale || score < 75
          ? 'Research first'
          : 'Ready to contact'
    return { ...lead, score, factors, flags, status, isDuplicate, completeness: quality }
  }).sort((a, b) => b.score - a.score)
}

export function formatMoney(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
