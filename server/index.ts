import cors from 'cors'
import express from 'express'
import { db } from './db'

type LeadRecord = {
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
  inQueue: number | boolean
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const columns = 'id, company, website, industry, location, revenue, employees, contact_name AS contactName, contact_title AS contactTitle, email, phone, last_updated AS lastUpdated, in_queue AS inQueue'
const insert = db.prepare(`INSERT OR REPLACE INTO leads (id, company, website, industry, location, revenue, employees, contact_name, contact_title, email, phone, last_updated, in_queue)
  VALUES (@id,@company,@website,@industry,@location,@revenue,@employees,@contactName,@contactTitle,@email,@phone,@lastUpdated,@inQueue)`)

function toLead(row: LeadRecord) {
  return { ...row, inQueue: Boolean(row.inQueue) }
}

function toRow(lead: LeadRecord) {
  return { ...lead, inQueue: lead.inQueue ? 1 : 0 }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: 'sqlite' }))
app.get('/api/leads', (_req, res) => {
  const rows = db.prepare(`SELECT ${columns} FROM leads ORDER BY created_at DESC`).all() as LeadRecord[]
  res.json(rows.map(toLead))
})
app.post('/api/leads/import', (req, res) => {
  const leads = req.body?.leads
  if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'Provide a non-empty leads array.' })
  const transaction = db.transaction((records: LeadRecord[]) => records.forEach((lead) => insert.run(toRow(lead))))
  transaction(leads)
  res.status(201).json({ imported: leads.length })
})
app.patch('/api/leads/:id/queue', (req, res) => {
  const inQueue = req.body?.inQueue ? 1 : 0
  const result = db.prepare('UPDATE leads SET in_queue = ? WHERE id = ?').run(inQueue, req.params.id)
  if (!result.changes) return res.status(404).json({ error: 'Lead not found.' })
  res.json({ id: req.params.id, inQueue: Boolean(inQueue) })
})
app.delete('/api/leads', (_req, res) => {
  const result = db.prepare('DELETE FROM leads').run()
  res.json({ deleted: result.changes })
})

app.listen(8787, () => console.log('Acquisition Queue API listening on http://localhost:8787'))
