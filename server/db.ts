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
  contact_title TEXT, email TEXT, phone TEXT, last_updated TEXT, in_queue INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`)
const fields = db.prepare('PRAGMA table_info(leads)').all() as { name: string }[]
if (!fields.some((field) => field.name === 'in_queue')) db.exec('ALTER TABLE leads ADD COLUMN in_queue INTEGER NOT NULL DEFAULT 0')
