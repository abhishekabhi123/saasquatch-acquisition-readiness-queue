import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dbPath = process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'queue.db')
mkdirSync(dirname(dbPath), { recursive: true })
export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, company TEXT NOT NULL, website TEXT NOT NULL, industry TEXT NOT NULL,
  location TEXT NOT NULL, revenue INTEGER, employees INTEGER, contact_name TEXT,
  contact_title TEXT, email TEXT, phone TEXT, last_updated TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`)
