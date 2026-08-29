export type LeadStatus = 'Ready to contact' | 'Research first' | 'Enrich first' | 'Deprioritize'

export type Lead = {
  id: string
  company: string
  website: string
  industry: string
  location: string
  revenue: number | null
  employees: number | null
  contactName: string | null
  contactTitle: string | null
  email: string | null
  phone: string | null
  lastUpdated: string | null
}

export type Icp = {
  industries: string[]
  locations: string[]
  minRevenue: number
  maxRevenue: number
  minEmployees: number
  maxEmployees: number
}

export type ScoreFactor = { label: string; points: number; max: number; detail: string }

export type ScoredLead = Lead & {
  score: number
  factors: ScoreFactor[]
  flags: string[]
  status: LeadStatus
  isDuplicate: boolean
  completeness: number
}
