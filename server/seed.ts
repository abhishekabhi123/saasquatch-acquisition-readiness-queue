import { db } from './db'
import { randomUUID } from 'node:crypto'
const leads = [
  ['Northstar Facility Care','northstarfacilitycare.example','Commercial Services','Phoenix, United States',8400000,68,'Maya Ortiz','Founder & CEO','maya@northstarfacilitycare.example','+16025550144','2026-08-22'],
  ['BrightPath Therapy Group','brightpaththerapy.example','Healthcare Services','Austin, United States',4900000,42,'Daniel Cho','Co-Founder','daniel@brightpaththerapy.example','+15125550161','2026-08-24']
]
const insert = db.prepare('INSERT OR REPLACE INTO leads VALUES (@id,@company,@website,@industry,@location,@revenue,@employees,@contactName,@contactTitle,@email,@phone,@lastUpdated,CURRENT_TIMESTAMP)')
db.transaction(() => leads.forEach(([company,website,industry,location,revenue,employees,contactName,contactTitle,email,phone,lastUpdated]) => insert.run({id:randomUUID(),company,website,industry,location,revenue,employees,contactName,contactTitle,email,phone,lastUpdated})))()
console.log(`Seeded ${leads.length} leads`)
