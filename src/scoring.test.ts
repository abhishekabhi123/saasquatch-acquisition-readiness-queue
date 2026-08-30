import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultIcp, demoLeads } from './data'
import { daysSince, isValidEmail, scoreLeads } from './scoring'

const today = new Date('2026-08-30T00:00:00')

test('Northstar scores as a ready owner-operator target', () => {
  const [lead] = scoreLeads(demoLeads.filter((item) => item.id === '1'), defaultIcp, today)
  assert.equal(lead.status, 'Ready to contact')
  assert.ok(lead.score >= 75)
  assert.equal(lead.flags.length, 0)
})

test('duplicate domains are penalized and deprioritized', () => {
  const scored = scoreLeads(demoLeads, defaultIcp, today)
  const duplicate = scored.find((lead) => lead.id === '7')
  assert.ok(duplicate)
  assert.equal(duplicate.isDuplicate, true)
  assert.equal(duplicate.status, 'Deprioritize')
  assert.ok(duplicate.flags.includes('Duplicate domain'))
})

test('missing contact routes require enrichment before outreach', () => {
  const [lead] = scoreLeads(demoLeads.filter((item) => item.id === '6'), defaultIcp, today)
  assert.equal(lead.status, 'Enrich first')
  assert.ok(lead.flags.includes('No decision-maker identified'))
})

test('near-band revenue still receives partial credit', () => {
  const [lead] = scoreLeads([{
    ...demoLeads[0],
    id: 'near',
    revenue: 1_700_000,
    website: 'nearband.example',
  }], defaultIcp, today)
  const revenue = lead.factors.find((factor) => factor.label === 'Revenue fit')
  assert.equal(revenue?.points, 13)
})

test('email validation and staleness helpers work', () => {
  assert.equal(isValidEmail('maya@northstarfacilitycare.example'), true)
  assert.equal(isValidEmail('not-an-email'), false)
  assert.equal(daysSince('2026-05-31', today), 91)
})
