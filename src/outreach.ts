import type { Icp, ScoredLead } from './types'
import { formatMoney } from './scoring'

const firstName = (name: string | null) => name?.split(' ')[0] ?? 'there'

export function draftOutreach(lead: ScoredLead, icp: Icp) {
  const industries = icp.industries.slice(0, 2).join(' and ')
  const subject = `Exploring a conversation about ${lead.company}`
  const body = `Hi ${firstName(lead.contactName)},

I work with acquisition entrepreneurs who look for owner-operated ${industries} businesses in the ${formatMoney(icp.minRevenue)}–${formatMoney(icp.maxRevenue)} range. ${lead.company} stood out because it is a ${lead.industry.toLowerCase()} company in ${lead.location.split(',')[0]}, which is squarely in the profile we are actively covering.

This is not a spray-and-pray inquiry. I would value 15 minutes to learn how you think about the next chapter of the business — whether that is staying independent, bringing in an operator, or exploring a transition on your timeline.

If now is not the right time, I am still glad to stay in touch.

Best,
[Your name]`

  const talkingPoints = [
    `Open with the specific reason ${lead.company} matched the live ICP, not a generic buyer pitch.`,
    lead.contactTitle ? `Address ${lead.contactName ?? 'the owner'} as ${lead.contactTitle} — do not bounce to a generic info@ inbox.` : 'Identify the owner before the first call; the current record is missing a decision-maker.',
    lead.status === 'Ready to contact' ? 'Ask for a 15-minute intro, then stop talking. The goal is a meeting, not a CIM.' : `Do not pitch yet. Recommended next step: ${lead.status.toLowerCase()}.`,
    lead.flags.length ? `Resolve first: ${lead.flags.join(', ')}.` : 'Data quality looks sufficient for a personalized first touch.',
  ]

  return { subject, body, talkingPoints }
}

export function dailyBrief(leads: ScoredLead[]) {
  const queued = leads.filter((lead) => lead.inQueue)
  const ready = queued.filter((lead) => lead.status === 'Ready to contact')
  const enrich = queued.filter((lead) => lead.status === 'Enrich first')
  const lines = [
    `Acquisition queue brief — ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
    '',
    `${ready.length} ready to contact · ${enrich.length} waiting on enrichment · ${queued.length} in the working queue`,
    '',
    'Call first:',
    ...(ready.length ? ready.slice(0, 5).map((lead, index) => `${index + 1}. ${lead.company} (${lead.score}) — ${lead.contactName ?? 'owner TBD'} · ${lead.email ?? lead.phone ?? 'no route'}`) : ['None. Add high-fit companies from discovery or loosen the ICP.']),
    '',
    'Do not call until enriched:',
    ...(enrich.length ? enrich.slice(0, 5).map((lead) => `- ${lead.company}: ${lead.flags[0] ?? 'missing contact route'}`) : ['None.']),
  ]
  return lines.join('\n')
}
