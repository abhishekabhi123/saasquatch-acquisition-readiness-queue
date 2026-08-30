import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeImportedLeads, parseLeadCsv } from './csv'
import { demoLeads } from './data'

test('CSV import accepts quoted locations and skips empty companies', () => {
  const rows = parseLeadCsv(`company,website,industry,location,revenue,employees,contactName,contactTitle,email,phone,lastUpdated
Acme Roofing,acme.example,Commercial Services,"Dallas, United States",2000000,20,Pat Lee,Owner,pat@acme.example,+12145550100,2026-08-01
,,,,,
`)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].location, 'Dallas, United States')
  assert.equal(rows[0].inQueue, false)
})

test('imports merge on website and keep existing queue membership', () => {
  const incoming = [{ ...demoLeads[0], id: 'import-new', contactTitle: 'CEO', inQueue: false }]
  const merged = mergeImportedLeads(demoLeads, incoming)
  const northstar = merged.find((lead) => lead.website === 'northstarfacilitycare.example' && lead.id === '1')
  assert.ok(northstar)
  assert.equal(northstar.inQueue, true)
  assert.equal(northstar.contactTitle, 'CEO')
  assert.equal(merged.length, demoLeads.length)
})
