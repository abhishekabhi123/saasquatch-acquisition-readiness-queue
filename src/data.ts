import type { Icp, Lead } from './types'

export const defaultIcp: Icp = {
  industries: ['Commercial Services', 'Healthcare Services', 'Business Services'],
  locations: ['United States'],
  minRevenue: 2_000_000,
  maxRevenue: 15_000_000,
  minEmployees: 15,
  maxEmployees: 125,
}

export const demoLeads: Lead[] = [
  { id: '1', company: 'Northstar Facility Care', website: 'northstarfacilitycare.example', industry: 'Commercial Services', location: 'Phoenix, United States', revenue: 8_400_000, employees: 68, contactName: 'Maya Ortiz', contactTitle: 'Founder & CEO', email: 'maya@northstarfacilitycare.example', phone: '+1 602 555 0144', lastUpdated: '2026-08-22', inQueue: true },
  { id: '2', company: 'BrightPath Therapy Group', website: 'brightpaththerapy.example', industry: 'Healthcare Services', location: 'Austin, United States', revenue: 4_900_000, employees: 42, contactName: 'Daniel Cho', contactTitle: 'Co-Founder', email: 'daniel@brightpaththerapy.example', phone: '+1 512 555 0161', lastUpdated: '2026-08-24', inQueue: true },
  { id: '3', company: 'Keystone Industrial Supply', website: 'keystoneindustrial.example', industry: 'Industrial Distribution', location: 'Columbus, United States', revenue: 11_200_000, employees: 93, contactName: 'Rachel Dunn', contactTitle: 'President', email: 'rachel@keystoneindustrial.example', phone: null, lastUpdated: '2026-06-14', inQueue: false },
  { id: '4', company: 'Atlas Back Office', website: 'atlasbackoffice.example', industry: 'Business Services', location: 'Denver, United States', revenue: 2_900_000, employees: 22, contactName: 'James Bennett', contactTitle: 'Owner', email: null, phone: '+1 303 555 0190', lastUpdated: '2026-08-26', inQueue: true },
  { id: '5', company: 'Vantage Home Health', website: 'vantagehomehealth.example', industry: 'Healthcare Services', location: 'Toronto, Canada', revenue: 7_300_000, employees: 85, contactName: 'Priya Shah', contactTitle: 'Managing Director', email: 'priya@vantagehomehealth.example', phone: '+1 416 555 0132', lastUpdated: '2026-08-27', inQueue: false },
  { id: '6', company: 'Evergreen Janitorial', website: 'evergreenjanitorial.example', industry: 'Commercial Services', location: 'Chicago, United States', revenue: 1_250_000, employees: 13, contactName: null, contactTitle: null, email: null, phone: null, lastUpdated: '2025-12-09', inQueue: false },
  { id: '7', company: 'Northstar Facility Care – duplicate import', website: 'northstarfacilitycare.example', industry: 'Commercial Services', location: 'Phoenix, United States', revenue: 8_400_000, employees: 68, contactName: 'Maya Ortiz', contactTitle: 'Founder & CEO', email: 'maya@northstarfacilitycare.example', phone: null, lastUpdated: '2026-08-22', inQueue: false },
  { id: '8', company: 'Relay Logistics Partners', website: 'relaylogistics.example', industry: 'Logistics', location: 'Nashville, United States', revenue: 18_700_000, employees: 172, contactName: 'Marcus Lee', contactTitle: 'CEO', email: 'marcus@relaylogistics.example', phone: '+1 615 555 0109', lastUpdated: '2026-08-20', inQueue: false },
]
