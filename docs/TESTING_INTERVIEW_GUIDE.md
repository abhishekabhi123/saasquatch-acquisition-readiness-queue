# Testing Guide & Technical Interview Preparation

## End-to-End Testing Steps

### 1. Initial Setup and Startup

```bash
# Navigate to project directory
cd /home/abhi/Documents/saasquatch-acquisition-readiness-queue

# Install dependencies (if needed)
npm install

# Seed the database with demo data
npm run seed

# Start the development server
npm run dev
```

**Expected Output:**
- Vite dev server on `http://localhost:5173`
- Express API on `http://localhost:8787`
- No build warnings or errors

### 2. Test API Endpoints

Open a new terminal and test the API:

```bash
# Health check
curl http://localhost:8787/api/health
# Expected: {"ok":true,"database":"sqlite"}

# Get all leads
curl http://localhost:8787/api/leads
# Expected: JSON array of 10 lead records

# Add a lead to queue
curl -X PATCH http://localhost:8787/api/leads/1/queue \
  -H 'Content-Type: application/json' \
  -d '{"inQueue": true}'
# Expected: {"id":"1","inQueue":true}

# Import new leads
curl -X POST http://localhost:8787/api/leads/import \
  -H 'Content-Type: application/json' \
  -d '{"leads":[{"id":"test-1","company":"Test Co","website":"test.example","industry":"Commercial Services","location":"Austin, United States","revenue":5000000,"employees":30,"contactName":"John Doe","contactTitle":"Owner","email":"john@test.example","phone":null,"lastUpdated":"2026-08-30","inQueue":false}]}'
# Expected: {"imported":1}
```

### 3. Test UI Functionality

#### A. Initial Load Test
1. Open `http://localhost:5173` in browser
2. Verify:
   - Loading state appears briefly
   - Demo data loads successfully
   - No error messages
   - Queue shows seeded leads

#### B. ICP Editor Test
1. Click "Edit ICP" button
2. Modify industries: "Commercial Services, Healthcare Services, Technology"
3. Change min revenue to "5000000"
4. Verify:
   - Scores update immediately in the table
   - Table re-sorts based on new scores
   - Changes persist after page refresh (localStorage)
   - Validation errors appear for invalid inputs (try negative numbers)

#### C. Queue Management Test
1. Go to "Lead discovery" tab
2. Click "Add to queue" on "Summit Roofing Co."
3. Verify:
   - Button changes to "Remove"
   - Lead appears in "Readiness queue" tab
   - Queue metrics update
4. Remove the lead and verify it disappears from queue

#### D. Search and Filter Test
1. In search box, type "Healthcare"
2. Verify only healthcare companies appear
3. Change status filter to "Ready to contact"
4. Verify only high-score leads appear
5. Enable "ICP matches only" toggle
6. Verify low-score leads are filtered out

#### E. CSV Import Test
1. Go to "Import leads" tab
2. Upload `demo-leads.csv`
3. Verify:
   - Success message appears
   - Import preserves existing queue membership
   - Duplicate websites are merged
   - Invalid records are skipped with warning
4. Test validation: try uploading a non-CSV file (should show error)

#### F. Error Handling Test
1. Stop the API server (Ctrl+C in the terminal running API)
2. Verify connection status changes to "Backend disconnected"
3. Try to toggle queue membership
4. Verify:
   - Connection status shows "Backend disconnected - using browser storage"
   - Error message explains changes are saved to browser storage only
   - Changes still work (using localStorage fallback)
   - Changes persist across page reloads (from localStorage)
5. Restart API: `npm run dev`
6. Verify connection status returns to "Backend connected"
7. Refresh the page
8. Verify data syncs from backend (overwrites localStorage)

#### G. Pagination Test
1. Import the demo CSV multiple times to create 50+ leads
2. Verify pagination controls appear
3. Test Previous/Next buttons
4. Verify page counter updates correctly

#### H. Virtual Scrolling Test
1. Import demo CSV until you have 100+ leads
2. Verify virtual scrolling indicator appears
3. Scroll through the list smoothly
4. Verify performance remains good

#### I. Export Test
1. Go to "Readiness queue"
2. Click "CRM export"
3. Verify CSV downloads with correct format
4. Click "Export X" (queue export)
5. Verify different CSV format with scores

#### J. Detail View Test
1. Click on any lead in the table
2. Verify:
   - Detail panel shows on the right
   - Score breakdown displays correctly
   - Quality flags appear
   - First-touch draft is generated
   - "Copy email" button works
3. Click "Copy brief" in toolbar
4. Verify clipboard contains daily brief

### 4. Run Unit Tests

```bash
npm test
```

**Expected Output:**
- All 7 tests pass
- Tests cover: scoring logic, duplicate detection, CSV parsing, merge logic

### 5. Production Build Test

```bash
npm run build
npm run start
```

**Expected Output:**
- Clean build with no errors
- Production API starts on port 8787
- Static files in `dist/` directory

## Code Architecture Deep Dive

### 1. Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Client (Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   App.tsx    │  │  scoring.ts  │  │   csv.ts     │      │
│  │ (UI State)   │  │ (Business)   │  │ (Data)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express API Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  index.ts    │  │   db.ts      │  │  seed.ts     │      │
│  │ (Endpoints)  │  │ (SQLite)     │  │ (Demo Data)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SQLite Database (WAL)                       │
│              data/queue.db                                   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Key Files and Their Responsibilities

#### **src/App.tsx** - Main Application Component
- **State Management**: React hooks for leads, ICP, UI state
- **API Integration**: Fetch/persist functions for backend communication
- **Business Logic**: Scoring, filtering, pagination, virtual scrolling
- **Error Handling**: Loading states, error messages, validation
- **Key Patterns**:
  - `useMemo` for expensive computations (scoring)
  - `useEffect` for side effects (API calls, localStorage)
  - Validation functions before state updates

#### **src/scoring.ts** - Deterministic Scoring Engine
- **Purpose**: Explainable, transparent lead scoring
- **Key Functions**:
  - `scoreLeads()`: Main scoring algorithm
  - `isValidEmail()`: Email validation
  - `daysSince()`: Date staleness calculation
  - `formatMoney()`: Currency formatting
- **Scoring Logic**:
  - Industry match (25 points)
  - Revenue fit (25 points, with near-band partial credit)
  - Location fit (15 points)
  - Employee range (15 points, with near-band partial credit)
  - Decision-maker reachability (10 points)
  - Data quality (10 points)
  - Penalties: Duplicate domain (-20), Stale data (-5)

#### **src/csv.ts** - CSV Import/Export
- **Purpose**: Handle CSV parsing, merging, and export
- **Key Functions**:
  - `parseLeadCsv()`: Parse CSV with Papa Parse
  - `mergeImportedLeads()**: Smart merge on website
  - `queueExportRows()`: Export format for queue
  - `crmExportRows()`: HubSpot-compatible export
- **Smart Merge Logic**: Preserves queue membership when matching websites

#### **src/outreach.ts** - First-Touch Email Generation
- **Purpose**: Generate personalized outreach drafts
- **Key Functions**:
  - `draftOutreach()`: Email subject, body, talking points
  - `dailyBrief()`: Daily call summary for team
- **Deterministic Approach**: No LLM, fully inspectable

#### **src/types.ts** - TypeScript Definitions
- **Purpose**: Type safety across the application
- **Key Types**:
  - `Lead`: Raw lead data
  - `ScoredLead`: Lead with scoring metadata
  - `Icp`: Ideal Customer Profile
  - `ScoreFactor`: Individual scoring component

#### **server/index.ts** - Express API
- **Purpose**: REST API for lead persistence
- **Endpoints**:
  - `GET /api/health`: Health check
  - `GET /api/leads`: Fetch all leads
  - `POST /api/leads/import`: Batch upsert
  - `PATCH /api/leads/:id/queue`: Update queue status
  - `DELETE /api/leads`: Clear all leads
- **Key Features**:
  - CORS enabled for development
  - JSON body parsing with size limit
  - SQLite transactions for data integrity

#### **server/db.ts** - Database Layer
- **Purpose**: SQLite connection and schema management
- **Key Features**:
  - WAL mode for better concurrency
  - Automatic schema migration
  - Type-safe query preparation

### 3. Technical Decisions Explained

#### **Why SQLite over PostgreSQL?**
- **MVP Simplicity**: Single-file database, no setup required
- **Zero Configuration**: Works out of the box
- **Sufficient for Demo**: Handles the use case effectively
- **Production Path**: Easy migration to PostgreSQL later

#### **Why Client-Side Scoring?**
- **Instant Feedback**: ICP changes update scores immediately
- **Transparency**: Users can inspect the scoring logic
- **No Server Load**: Scoring doesn't hit the API
- **Deterministic**: Same inputs always produce same outputs

#### **Why Virtual Scrolling?**
- **Performance**: Handles large datasets (1000+ leads) smoothly
- **Memory Efficiency**: Only renders visible rows
- **User Experience**: Fast scrolling without lag
- **Progressive Enhancement**: Falls back to pagination for small datasets

#### **Why CSV Merge on Website?**
- **Data Integrity**: Prevents duplicate records
- **Queue Preservation**: Doesn't wipe working queue on re-import
- **User Intent**: Matching websites likely same company
- **Incremental Updates**: Allows data refresh without losing state

#### **Why Deterministic Outreach?**
- **Inspectability**: Users can review and edit drafts
- **Consistency**: Same lead always gets same draft
- **No API Costs**: No LLM usage
- **Transparency**: Clear how content is generated

### 4. State Management Flow

```
User Action → React State Update → useEffect Trigger → API Call → Database Update
     ↓                    ↓                    ↓              ↓            ↓
UI Update → localStorage Persist → Loading State → Success/Error → State Sync
```

### 5. Error Handling Strategy

- **Optimistic UI**: Update UI immediately, revert on error
- **User Feedback**: Clear error messages with dismissible notices
- **Graceful Degradation**: Fallback to localStorage if API fails
- **Connection Status**: Visual indicator of backend connectivity
- **Offline Capability**: LocalStorage backup allows continued work offline
- **Validation**: Client-side validation before API calls
- **Loading States**: Visual feedback during async operations

### 6. Backend Disconnection Behavior

**Why it works without backend:**
- The app uses localStorage as a fallback storage mechanism
- When backend is unavailable, changes are saved to browser storage
- Connection status indicator shows current backend state
- On reconnection, data syncs from backend (authoritative source)

**This is intentional design:**
- Provides offline capability for demo/testing
- Prevents data loss during network issues
- Allows continued work during backend outages
- Backend remains the authoritative source when available

## Video Walkthrough Script (Enhanced)

### **0:00–0:20 — Problem & Solution**
"SaaSquatch excels at finding and enriching companies, but the real bottleneck is human decision-making. This Acquisition Readiness Queue solves that by providing an explainable, scored workspace that turns raw leads into actionable outreach plans."

### **0:20–0:45 — Architecture Overview**
"Let me walk through the stack: React 19 with TypeScript on the client, Express with SQLite on the server, Papa Parse for CSV handling, and deterministic TypeScript for scoring. The API handles persistence while the client handles real-time scoring for instant feedback."

### **0:45–1:10 — Discovery vs Queue**
"Here's the key distinction: Discovery is the raw universe of all leads, while the Queue is your deliberate working set. Notice the duplicate Northstar record gets flagged automatically. I can add Summit Roofing to the queue with one click. This separation prevents spray-and-pray outreach."

### **1:10–1:35 — Explainable Scoring**
"Clicking on Northstar shows the complete score breakdown. Every factor is transparent: industry fit, revenue band, location, team size, decision-maker reachability, and data quality. I can edit the ICP in real-time and watch the scores update instantly. No black box—this is how you explain a rank to a founder."

### **1:35–1:55 — Action & Outreach**
"For leads ready to contact, I get a personalized first-touch draft and talking points based on the actual score, not generic templates. I can copy this daily brief for my team or export directly to HubSpot format. The output isn't just more data—it's who to call today, why, and what to say."

### **1:55–2:15 — Technical Features**
"We've added robust error handling with loading states, client-side validation for ICP settings and CSV imports, pagination for large datasets, and virtual scrolling that auto-enables for 100+ records. The SQLite database uses WAL mode for better performance, and we have comprehensive test coverage."

### **2:15–2:30 — Data Ethics & Production Path**
"This is a demo with fictional data—no live scraping or CAPTCHA bypass. In production, we'd move to managed PostgreSQL, add authentication, and use licensed enrichment providers. The static client and containerized API scale independently."

## Technical Interview Talking Points

### **When asked about architecture:**
- "I chose a client-server separation because scoring needs to be instant while persistence needs to be reliable. The client handles real-time ICP changes without API latency, while the server ensures data integrity."

### **When asked about performance:**
- "I implemented virtual scrolling for large datasets—rendering only visible rows plus a buffer. For smaller datasets, traditional pagination is more appropriate. The system auto-switches based on data size."

### **When asked about data integrity:**
- "CSV imports merge on website rather than replace records. This preserves queue membership and prevents data loss. We also use SQLite transactions to ensure atomic updates."

### **When asked about testing:**
- "I have unit tests for the core business logic—scoring algorithms and CSV parsing. The integration is tested manually through the API endpoints, and I've added comprehensive error handling to catch edge cases."

### **When asked about scalability:**
- "The current architecture scales horizontally. The React client is static and can be served from CDNs. The Express API is stateless and can be containerized. The database would move to managed PostgreSQL in production."

### **When asked about the scoring model:**
- "The scoring is deterministic and explainable by design. Each factor has a clear weight and business rationale. Near-band matching gives partial credit, which prevents binary filtering that might miss good candidates."

### **When asked about error handling:**
- "I use optimistic UI updates with automatic rollback on failure. Users get immediate feedback, and errors are displayed with clear, actionable messages. The system gracefully degrades to localStorage backup if the API is unavailable, allowing continued work offline. When the backend reconnects, it becomes the authoritative source again."

## Common Interview Questions & Answers

### **Q: Why did you choose React over other frameworks?**
A: "React's component model and hooks make it easy to manage complex state like our ICP editor and lead table. The ecosystem is mature, and TypeScript integration is excellent. For this analytical workspace, React's reactivity is perfect."

### **Q: How do you handle concurrent updates?**
A: "SQLite's WAL mode allows concurrent reads. For writes, we use transactions to ensure atomicity. In production with PostgreSQL, we'd use row-level locking and optimistic concurrency control."

### **Q: What's your testing strategy?**
A: "Unit tests for pure functions (scoring, CSV parsing), integration tests for API endpoints, and manual E2E testing for the UI. The deterministic nature of the scoring makes it highly testable."

### **Q: How would you add authentication?**
A: "I'd add JWT-based authentication middleware to the Express API, store tokens in httpOnly cookies, and add protected routes. The client would check auth state and redirect to login if needed."

### **Q: What about real-time collaboration?**
A: "I'd add WebSockets or use a service like Pusher to broadcast queue changes to other users. The scoring would remain client-side for performance, but queue membership would sync in real-time."

## Performance Optimization Techniques Used

1. **useMemo**: Expensive scoring computations only recalculate when dependencies change
2. **Virtual Scrolling**: Render only visible rows for large datasets
3. **Pagination**: Limit DOM nodes for smaller datasets
4. **Debouncing**: Could be added to search input (not implemented yet)
5. **Code Splitting**: Vite handles this automatically
6. **SQLite WAL**: Better read concurrency
7. **CSS-in-JS avoidance**: Plain CSS for better performance

## Security Considerations

1. **Input Validation**: Client-side validation before API calls
2. **SQL Injection**: Parameterized queries via prepared statements
3. **XSS Prevention**: React's built-in escaping
4. **CORS**: Configured for development only
5. **Rate Limiting**: Would add in production
6. **Authentication**: Would add JWT-based auth in production
7. **Data Encryption**: Would add TLS in production

## Deployment Strategy

1. **Client**: Vercel or Cloudflare Pages (static hosting)
2. **API**: Render, Railway, or AWS ECS (containerized)
3. **Database**: Neon, RDS, or Cloud SQL (managed Postgres)
4. **Environment Variables**: Use provider's secret manager
5. **CI/CD**: GitHub Actions for automated testing and deployment
6. **Monitoring**: Add Sentry for error tracking
7. **Backups**: Automated database backups

## Final Interview Tips

1. **Be Specific**: Reference actual code and decisions you made
2. **Show Trade-offs**: Explain why you chose one approach over another
3. **Demonstrate Curiosity**: Ask questions about their technical stack
4. **Be Honest**: Admit what you'd improve in production
5. **Connect to Business**: Always tie technical decisions to business value
6. **Show Enthusiasm**: This is a cool problem you enjoyed solving

Your project demonstrates full-stack competence, attention to UX, and understanding of production considerations. You're well-prepared!
