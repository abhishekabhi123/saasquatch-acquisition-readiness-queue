import cors from 'cors'
import express from 'express'
import { db } from './db'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const columns = 'id, company, website, industry, location, revenue, employees, contact_name AS contactName, contact_title AS contactTitle, email, phone, last_updated AS lastUpdated'
const insertColumns = 'id, company, website, industry, location, revenue, employees, contact_name, contact_title, email, phone, last_updated'
app.get('/api/health', (_req, res) => res.json({ ok: true, database: 'sqlite' }))
app.get('/api/leads', (_req, res) => res.json(db.prepare(`SELECT ${columns} FROM leads ORDER BY created_at DESC`).all()))
app.post('/api/leads/import', (req, res) => {
  const leads = req.body?.leads
  if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'Provide a non-empty leads array.' })
  const insert = db.prepare(`INSERT OR REPLACE INTO leads (${insertColumns}) VALUES (@id,@company,@website,@industry,@location,@revenue,@employees,@contactName,@contactTitle,@email,@phone,@lastUpdated)`)
  const transaction = db.transaction((records) => records.forEach(insert.run.bind(insert)))
  transaction(leads)
  res.status(201).json({ imported: leads.length })
})
app.delete('/api/leads', (_req, res) => { const result = db.prepare('DELETE FROM leads').run(); res.json({ deleted: result.changes }) })

app.listen(8787, () => console.log('Acquisition Queue API listening on http://localhost:8787'))
