import { db } from './db'
import { demoLeads } from '../src/data'

const insert = db.prepare(`INSERT OR REPLACE INTO leads (id, company, website, industry, location, revenue, employees, contact_name, contact_title, email, phone, last_updated, in_queue, created_at)
  VALUES (@id, @company, @website, @industry, @location, @revenue, @employees, @contactName, @contactTitle, @email, @phone, @lastUpdated, @inQueue, CURRENT_TIMESTAMP)`)

db.transaction(() => {
  demoLeads.forEach((lead) => insert.run({ ...lead, inQueue: lead.inQueue ? 1 : 0 }))
})()

console.log(`Seeded ${demoLeads.length} leads`)
