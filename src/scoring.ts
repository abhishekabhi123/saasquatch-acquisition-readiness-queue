import type { Icp, Lead, ScoreFactor, ScoredLead } from './types'

const normalize = (value: string) => value.trim().toLowerCase()
const inRange = (value: number | null, min: number, max: number) => value !== null && value >= min && value <= max

function completeness(lead: Lead) {
  const fields = [lead.website, lead.industry, lead.location, lead.revenue, lead.employees, lead.contactName, lead.email, lead.phone]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

export function scoreLeads(leads: Lead[], icp: Icp): ScoredLead[] {
  const domainCounts = new Map<string, number>()
  leads.forEach((lead) => domainCounts.set(normalize(lead.website), (domainCounts.get(normalize(lead.website)) ?? 0) + 1))

  return leads.map((lead) => {
    const industryMatch = icp.industries.some((industry) => normalize(industry) === normalize(lead.industry))
    const locationMatch = icp.locations.some((location) => normalize(lead.location).includes(normalize(location)))
    const revenueMatch = inRange(lead.revenue, icp.minRevenue, icp.maxRevenue)
    const employeeMatch = inRange(lead.employees, icp.minEmployees, icp.maxEmployees)
    const contactReady = Boolean(lead.contactName && (lead.email || lead.phone))
    const quality = completeness(lead)
    const factors: ScoreFactor[] = [
      { label: 'Industry fit', points: industryMatch ? 25 : 0, max: 25, detail: industryMatch ? `${lead.industry} matches your ICP` : `${lead.industry} is outside your ICP` },
      { label: 'Revenue fit', points: revenueMatch ? 25 : 0, max: 25, detail: revenueMatch ? 'Within target revenue band' : 'Outside target revenue band' },
      { label: 'Location fit', points: locationMatch ? 15 : 0, max: 15, detail: locationMatch ? 'Within target geography' : 'Outside target geography' },
      { label: 'Team size', points: employeeMatch ? 15 : 0, max: 15, detail: employeeMatch ? 'Within target employee range' : 'Outside target employee range' },
      { label: 'Decision-maker', points: contactReady ? 10 : 0, max: 10, detail: contactReady ? 'Contact route is available' : 'No reachable decision-maker yet' },
      { label: 'Data quality', points: Math.round(quality / 10), max: 10, detail: `${quality}% profile completeness` },
    ]
    const isDuplicate = (domainCounts.get(normalize(lead.website)) ?? 0) > 1
    const flags = [
      ...(isDuplicate ? ['Duplicate domain'] : []),
      ...(!lead.email ? ['No verified email'] : []),
      ...(!lead.contactName ? ['No decision-maker identified'] : []),
      ...(quality < 70 ? ['Incomplete profile'] : []),
    ]
    const rawScore = factors.reduce((total, factor) => total + factor.points, 0)
    const score = Math.max(0, rawScore - (isDuplicate ? 20 : 0))
    const status: ScoredLead['status'] = isDuplicate || score < 45 ? 'Deprioritize' : !contactReady ? 'Enrich first' : score >= 75 ? 'Ready to contact' : 'Research first'
    return { ...lead, score, factors, flags, status, isDuplicate, completeness: quality }
  }).sort((a, b) => b.score - a.score)
}

export function formatMoney(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
