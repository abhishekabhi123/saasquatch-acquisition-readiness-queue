# Technical Quick Reference

## Key Technical Concepts

### 1. State Management Patterns
```typescript
// Basic state
const [leads, setLeads] = useState<Lead[]>(demoLeads)

// Derived state (computed)
const scored = useMemo(() => scoreLeads(leads, icp), [leads, icp])

// Side effects
useEffect(() => {
  fetch('/api/leads').then(/* ... */)
}, [])

// Refs (non-reactive values)
const input = useRef<HTMLInputElement>(null)
```

### 2. Error Handling Pattern
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const fetchData = async () => {
  setLoading(true)
  setError(null)
  try {
    const response = await fetch('/api/leads')
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    setLeads(data)
  } catch (err) {
    setError('Could not load data')
  } finally {
    setLoading(false)
  }
}
```

### 3. Validation Pattern
```typescript
function validateIcp(icp: Icp): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!icp.industries.length) errors.push('Industry required')
  if (icp.minRevenue < 0) errors.push('Invalid revenue')
  return { valid: errors.length === 0, errors }
}
```

### 4. Pagination Logic
```typescript
const currentPage = 1
const itemsPerPage = 25
const totalPages = Math.ceil(totalItems / itemsPerPage)
const startIndex = (currentPage - 1) * itemsPerPage
const endIndex = startIndex + itemsPerPage
const paginatedItems = allItems.slice(startIndex, endIndex)
```

### 5. Virtual Scrolling Logic
```typescript
const rowHeight = 60
const scrollTop = container.scrollTop
const viewportHeight = 600

const startIndex = Math.floor(scrollTop / rowHeight)
const visibleCount = Math.ceil(viewportHeight / rowHeight)
const endIndex = startIndex + visibleCount + buffer

const visibleItems = allItems.slice(
  Math.max(0, startIndex - buffer),
  Math.min(allItems.length, endIndex + buffer)
)
```

## Key File Functions

### src/scoring.ts
```typescript
// Main scoring function
scoreLeads(leads: Lead[], icp: Icp): ScoredLead[]

// Email validation
isValidEmail(email: string | null): boolean

// Date calculation
daysSince(dateString: string | null, today?: Date): number | null

// Currency formatting
formatMoney(amount: number | null): string
```

### src/csv.ts
```typescript
// Parse CSV to leads
parseLeadCsv(csvText: string): Lead[]

// Merge imports with existing data
mergeImportedLeads(current: Lead[], incoming: Lead[]): Lead[]

// Export formats
queueExportRows(leads: ScoredLead[]): string[][]
crmExportRows(leads: ScoredLead[]): string[][]

// Download CSV
downloadCsv(filename: string, rows: string[][]): void
```

### src/outreach.ts
```typescript
// Generate email draft
draftOutreach(lead: ScoredLead, icp: Icp): EmailDraft

// Generate daily brief
dailyBrief(leads: ScoredLead[]): string
```

## API Endpoints

### GET /api/health
```bash
curl http://localhost:8787/api/health
# Response: {"ok":true,"database":"sqlite"}
```

### GET /api/leads
```bash
curl http://localhost:8787/api/leads
# Response: [{ id, company, website, ... }, ...]
```

### POST /api/leads/import
```bash
curl -X POST http://localhost:8787/api/leads/import \
  -H 'Content-Type: application/json' \
  -d '{"leads": [...]}'
# Response: {"imported": 5}
```

### PATCH /api/leads/:id/queue
```bash
curl -X PATCH http://localhost:8787/api/leads/1/queue \
  -H 'Content-Type': application/json' \
  -d '{"inQueue": true}'
# Response: {"id":"1","inQueue":true}
```

### DELETE /api/leads
```bash
curl -X DELETE http://localhost:8787/api/leads
# Response: {"deleted": 10}
```

## Scoring Algorithm

### Factor Weights
- Industry match: 25 points
- Revenue fit: 25 points (with near-band partial credit)
- Location fit: 15 points
- Employee range: 15 points (with near-band partial credit)
- Decision-maker: 10 points
- Data quality: 10 points

### Penalties
- Duplicate domain: -20 points
- Stale data (>90 days): -5 points

### Status Logic
```typescript
if (isDuplicate || score < 45) return 'Deprioritize'
if (!contactReady) return 'Enrich first'
if (stale || score < 75) return 'Research first'
return 'Ready to contact'
```

## TypeScript Types

### Lead
```typescript
type Lead = {
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
  inQueue: boolean
}
```

### ScoredLead
```typescript
type ScoredLead = Lead & {
  score: number
  factors: ScoreFactor[]
  flags: string[]
  status: LeadStatus
  isDuplicate: boolean
  completeness: number
}
```

### ICP
```typescript
type Icp = {
  industries: string[]
  locations: string[]
  minRevenue: number
  maxRevenue: number
  minEmployees: number
  maxEmployees: number
}
```

## Database Schema

```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  website TEXT NOT NULL,
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  revenue INTEGER,
  employees INTEGER,
  contact_name TEXT,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  last_updated TEXT,
  in_queue INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

## Performance Optimization

### React Performance
- `useMemo` for expensive computations
- `useCallback` for event handlers (not used but could be)
- Virtual scrolling for large lists
- Pagination for smaller lists

### Database Performance
- SQLite WAL mode for better concurrency
- Prepared statements for query efficiency
- Indexed primary key (id)

### Network Performance
- Optimistic UI updates
- Error recovery without full reload
- Efficient data structures (arrays vs objects)

## Error Handling

### API Errors
- Network failures: Show error, use localStorage fallback
- Server errors: Display error message, fallback to localStorage
- Validation errors: Show inline validation messages
- Connection status: Visual indicator of backend connectivity

### Offline Capability
- localStorage backup when backend is unavailable
- Connection status indicator (connected/disconnected)
- Changes persist across page reloads (from localStorage)
- Backend becomes authoritative source when reconnected

### UI Errors
- Missing data: Graceful fallbacks (display "—" for null values)
- Invalid states: Prevent with validation
- Loading states: Visual feedback during async operations

## CSS Architecture

### BEM-like Naming
- `.app` - Main container
- `.table` - Table component
- `.table-title` - Table header
- `.table-overflow` - Scrollable table area
- `.notice` - Notification component
- `.notice.error` - Error variant
- `.notice.loading` - Loading variant

### Responsive Design
- Desktop: Full sidebar + main content
- Tablet: Collapsed sidebar
- Mobile: Bottom navigation bar

## Development Workflow

### Starting Development
```bash
npm install          # Install dependencies
npm run seed         # Seed database
npm run dev          # Start dev servers
```

### Testing
```bash
npm test             # Run unit tests
npm run build        # Type check + build
npm run start        # Production API only
```

### Git Workflow
```bash
git add .            # Stage changes
git commit -m "..."  # Commit with message
git push             # Push to remote
```

## Common Issues & Solutions

### Vite Config Warning
- **Issue**: ESM syntax warning
- **Solution**: Added `"type": "module"` to package.json

### TypeScript Errors
- **Issue**: Type mismatches
- **Solution**: Use proper type annotations and null checks

### API Connection Issues
- **Issue**: CORS or connection refused
- **Solution**: Ensure API is running on port 8787

### Database Issues
- **Issue**: SQLite file locked
- **Solution**: Stop API server, delete WAL files, restart

## Production Checklist

- [ ] Add authentication (JWT)
- [ ] Add rate limiting
- [ ] Move to PostgreSQL
- [ ] Add environment variables
- [ ] Add HTTPS/TLS
- [ ] Add error monitoring (Sentry)
- [ ] Add logging
- [ ] Add database backups
- [ ] Add CI/CD pipeline
- [ ] Add comprehensive tests
- [ ] Add input sanitization
- [ ] Add CSP headers

## Key Interview Concepts

### Separation of Concerns
- UI (React) vs Business Logic (scoring) vs Data (API/DB)
- Client-side vs Server-side responsibilities
- Stateless API vs Stateful UI

### Trade-offs
- SQLite vs PostgreSQL (simplicity vs scalability)
- Client-side vs Server-side scoring (speed vs consistency)
- Pagination vs Virtual Scrolling (simplicity vs performance)

### Scalability
- Horizontal scaling (stateless API)
- Vertical scaling (better hardware)
- Database scaling (read replicas, sharding)

### Maintainability
- Type safety (TypeScript)
- Test coverage (unit tests)
- Code organization (separation of concerns)
- Documentation (README, comments)

This quick reference should help you quickly recall key technical details during your interview!
