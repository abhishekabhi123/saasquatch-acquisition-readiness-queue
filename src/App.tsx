import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, CircleAlert, ClipboardCopy, FileUp, Search, Settings2, Sparkles, X } from 'lucide-react'
import { crmExportRows, downloadCsv, mergeImportedLeads, parseLeadCsv, queueExportRows } from './csv'
import { defaultIcp, demoLeads } from './data'
import { dailyBrief, draftOutreach } from './outreach'
import { formatMoney, scoreLeads } from './scoring'
import type { Icp, Lead, ScoredLead } from './types'

type View = 'queue' | 'discovery' | 'imports'
const statuses = ['All leads', 'Ready to contact', 'Research first', 'Enrich first', 'Deprioritize'] as const
const ICP_KEY = 'acquisition-queue-icp'
const LEADS_KEY = 'acquisition-queue-leads'
const scoreClass = (score: number) => (score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low')
const toNumber = (value: string) => Number(value) || 0

function validateIcp(icp: Icp): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!icp.industries.length) errors.push('At least one industry is required')
  if (!icp.locations.length) errors.push('At least one location is required')
  if (icp.minRevenue < 0) errors.push('Minimum revenue cannot be negative')
  if (icp.maxRevenue < 0) errors.push('Maximum revenue cannot be negative')
  if (icp.minRevenue > icp.maxRevenue) errors.push('Minimum revenue cannot exceed maximum revenue')
  if (icp.minEmployees < 0) errors.push('Minimum employees cannot be negative')
  if (icp.maxEmployees < 0) errors.push('Maximum employees cannot be negative')
  if (icp.minEmployees > icp.maxEmployees) errors.push('Minimum employees cannot exceed maximum employees')
  
  return { valid: errors.length === 0, errors }
}

function loadIcp(): Icp {
  try {
    const parsed = JSON.parse(localStorage.getItem(ICP_KEY) ?? '')
    if (!Array.isArray(parsed.industries) || !Array.isArray(parsed.locations)) return defaultIcp
    return { ...defaultIcp, ...parsed }
  } catch {
    return defaultIcp
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(demoLeads)
  const [icp, setIcp] = useState<Icp>(loadIcp)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof statuses)[number]>('All leads')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showIcp, setShowIcp] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useState<View>('queue')
  const [strictIcp, setStrictIcp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [useVirtualScroll, setUseVirtualScroll] = useState(false)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch('/api/leads', {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const records = await response.json()
          if (records.length) {
            setLeads(records)
            localStorage.setItem(LEADS_KEY, JSON.stringify(records))
            setBackendConnected(true)
          } else {
            // Backend connected but no data, try localStorage
            const storedLeads = localStorage.getItem(LEADS_KEY)
            if (storedLeads) {
              try {
                const parsed = JSON.parse(storedLeads)
                setLeads(parsed)
              } catch {
                setLeads(demoLeads)
              }
            } else {
              setLeads(demoLeads)
            }
            setBackendConnected(true)
          }
        } else {
          throw new Error('Failed to load leads')
        }
      } catch (err) {
        console.error('Load error:', err)
        setBackendConnected(false)
        
        // Try to load from localStorage as fallback
        const storedLeads = localStorage.getItem(LEADS_KEY)
        if (storedLeads) {
          try {
            const parsed = JSON.parse(storedLeads)
            setLeads(parsed)
          } catch {
            setLeads(demoLeads)
          }
        } else {
          setLeads(demoLeads)
        }
      }
      
      setLoading(false)
    }
    
    loadInitialData()
  }, [])

  useEffect(() => {
    localStorage.setItem(ICP_KEY, JSON.stringify(icp))
  }, [icp])

  // Robust backend health checking
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let isMounted = true

    const checkHealth = async () => {
      if (!isMounted) return
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
        
        const response = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-cache',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok && isMounted) {
          setBackendConnected(true)
          setError(null)
          setIsCheckingConnection(false)
        } else {
          throw new Error('Health check failed')
        }
      } catch (err) {
        if (isMounted) {
          setBackendConnected(false)
          setIsCheckingConnection(false)
          // Only show error if we were previously connected
          if (backendConnected) {
            setError('Backend disconnected. Switching to browser storage mode.')
          }
        }
      }
    }

    // Initial check
    checkHealth()

    // Periodic checks every 3 seconds
    intervalId = setInterval(checkHealth, 3000)

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [backendConnected]) // Re-run when backendConnected changes to update error message

  const persist = async (records: Lead[]) => {
    // Always save to localStorage as backup
    localStorage.setItem(LEADS_KEY, JSON.stringify(records))
    
    if (!backendConnected) {
      return // Silently use localStorage when backend is disconnected
    }
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: records }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error('Failed to save leads to server')
    } catch (err) {
      console.error('Persist error:', err)
      setBackendConnected(false) // Update connection status on failure
    }
  }

  const scored = useMemo(() => scoreLeads(leads, icp), [leads, icp])
  const discoveryLeads = scored.filter((lead) => `${lead.company} ${lead.industry} ${lead.location} ${lead.contactName ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const queueLeads = discoveryLeads.filter((lead) => lead.inQueue && (status === 'All leads' || lead.status === status) && (!strictIcp || lead.score >= 55))
  const ready = scored.filter((lead) => lead.inQueue && lead.status === 'Ready to contact').length
  const duplicates = scored.filter((lead) => lead.isDuplicate).length
  const selected = scored.find((lead) => lead.id === selectedId) ?? null
  const allVisible = view === 'queue' ? queueLeads : discoveryLeads
  
  // Pagination logic
  const totalPages = Math.ceil(allVisible.length / itemsPerPage)
  const paginatedVisible = allVisible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  
  // Virtual scrolling logic
  const [scrollTop, setScrollTop] = useState(0)
  const rowHeight = 60 // approximate height of each row in pixels
  
  const virtualStart = Math.floor(scrollTop / rowHeight)
  const virtualEnd = Math.min(virtualStart + Math.ceil(600 / rowHeight) + 5, allVisible.length) // Render ~600px viewport + buffer
  const virtualVisible = allVisible.slice(Math.max(0, virtualStart - 5), virtualEnd)
  const virtualOffset = Math.max(0, virtualStart - 5) * rowHeight
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setScrollTop(0)
  }, [query, status, strictIcp, view])
  
  // Auto-enable virtual scroll for large datasets
  useEffect(() => {
    setUseVirtualScroll(allVisible.length > 100)
  }, [allVisible.length])
  
  const visible = useVirtualScroll ? virtualVisible : paginatedVisible

  const updateIcp = <K extends keyof Icp>(key: K, value: Icp[K]) => setIcp((current) => ({ ...current, [key]: value }))
  const openImport = () => input.current?.click()
  const flash = (message: string) => setNotice(message)

  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      flash('Please upload a CSV file.')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      flash('File is too large. Maximum size is 5MB.')
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const content = String(reader.result)
        if (!content.trim()) throw new Error('File is empty')
        
        const records = parseLeadCsv(content)
        if (!records.length) throw new Error('No lead rows found')
        
        // Validate imported records
        const invalidRecords = records.filter(record => 
          !record.company || !record.website || !record.industry || !record.location
        )
        
        if (invalidRecords.length > 0) {
          flash(`${invalidRecords.length} records have missing required fields (company, website, industry, location). They were skipped.`)
        }
        
        const validRecords = records.filter(record => 
          record.company && record.website && record.industry && record.location
        )
        
        if (!validRecords.length) throw new Error('No valid records found after validation')
        
        const merged = mergeImportedLeads(leads, validRecords)
        setLeads(merged)
        setSelectedId(null)
        persist(merged)
        flash(`Imported ${validRecords.length} valid rows${invalidRecords.length ? ` (${invalidRecords.length} invalid skipped)` : ''} without wiping the queue. Review them in discovery, then add only the ones worth a call.`)
        setView('discovery')
      } catch (err) {
        console.error('Import error:', err)
        flash('Could not read that CSV. Use the headers in demo-leads.csv.')
      }
    }
    reader.onerror = () => {
      flash('Error reading file. Please try again.')
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const toggleQueue = async (lead: ScoredLead) => {
    const inQueue = !lead.inQueue
    const next = leads.map((item) => (item.id === lead.id ? { ...item, inQueue } : item))
    setLeads(next)
    
    // Save to localStorage immediately
    localStorage.setItem(LEADS_KEY, JSON.stringify(next))
    
    if (!backendConnected) {
      return // Silently use localStorage when backend is disconnected
    }
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(`/api/leads/${lead.id}/queue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inQueue }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error('Failed to update queue status')
    } catch (err) {
      console.error('Queue toggle error:', err)
      setBackendConnected(false) // Update connection status on failure
    }
  }

  const copyBrief = async () => {
    await copyText(dailyBrief(scored))
    flash('Daily call brief copied. Paste it into Slack, email, or your CRM task list.')
  }

  const title = view === 'queue' ? 'Readiness queue' : view === 'discovery' ? 'Lead discovery' : 'Import leads'
  const subtitle = view === 'queue'
    ? 'Turn a raw lead list into a focused outreach plan.'
    : view === 'discovery'
      ? 'Explore the lead universe before choosing who deserves outreach.'
      : 'Bring a spreadsheet into a scored, actionable workspace.'

  return (
    <div className="app">
      <aside>
        <div className="brand"><b>S</b><div><strong>SaaSquatch</strong><span>ACQUISITION QUEUE</span></div></div>
        <nav><Nav view={view} setView={setView} /></nav>
        <footer><label>DEMO WORKSPACE</label><p>Prioritize the owners most likely to take your call.</p></footer>
      </aside>
      <main>
        <header>
          <div>
            <label>ACQUISITION INTELLIGENCE</label>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {view !== 'imports' && (
            <button className="icp-trigger" onClick={() => setShowIcp(!showIcp)}>
              <Settings2 size={14} />{showIcp ? 'Close ICP' : 'Edit ICP'}
            </button>
          )}
        </header>
        {showIcp && <IcpEditor icp={icp} update={updateIcp} reset={() => setIcp(defaultIcp)} />}
        <div className={`connection-status ${backendConnected ? 'connected' : 'disconnected'} ${isCheckingConnection ? 'checking' : ''}`}>
          <span>
            {isCheckingConnection ? '● Checking backend connection...' : 
             backendConnected ? '● Backend connected' : '● Backend disconnected - using browser storage'}
          </span>
        </div>
        {error && (
          <div className="notice error">
            <CircleAlert size={16} />{error}
            <button aria-label="Dismiss message" onClick={() => setError(null)}><X size={15} /></button>
          </div>
        )}
        {notice && (
          <div className="notice">
            <CircleAlert size={16} />{notice}
            <button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button>
          </div>
        )}
        {loading && (
          <div className="notice loading">
            <CircleAlert size={16} />Loading leads from server...
          </div>
        )}
        <input className="hide" ref={input} type="file" accept=".csv,text/csv" onChange={importCsv} />
        {view === 'imports' ? (
          <ImportScreen openImport={openImport} />
        ) : (
          <>
            {view === 'queue' && (
              <section className="metrics">
                <Metric l="Queue candidates" v={`${queueLeads.length}`} c={strictIcp ? 'Strict ICP match enabled' : 'Saved for review'} />
                <Metric l="Ready to contact" v={`${ready}`} c="Reachable & in-profile" type="green" />
                <Metric l="Duplicate records" v={`${duplicates}`} c="Flagged by website" type="amber" />
                <Metric l="Avg. data quality" v={`${Math.round(scored.reduce((sum, lead) => sum + lead.completeness, 0) / scored.length || 0)}%`} c="Across discovery" />
              </section>
            )}
            {view === 'discovery' && (
              <div className="discovery-note">
                <Sparkles size={16} />
                <span>This is the raw lead universe. Add promising companies to the <b>Readiness queue</b> after a first pass. Imports merge on website so duplicates do not silently replace a working list.</span>
              </div>
            )}
            <section className="toolbar">
              <div className="search">
                <Search size={17} />
                <input placeholder="Search companies, industries, locations…" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <div className="actions">
                {view === 'queue' && (
                  <label className="strict-toggle">
                    <input type="checkbox" checked={strictIcp} onChange={(event) => setStrictIcp(event.target.checked)} />
                    ICP matches only
                  </label>
                )}
                {view === 'queue' && (
                  <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                    {statuses.map((item) => <option key={item}>{item}</option>)}
                  </select>
                )}
                <button className="outline" onClick={openImport}><FileUp size={16} />Import CSV</button>
                {view === 'queue' && <button className="outline" onClick={copyBrief}><ClipboardCopy size={16} />Copy brief</button>}
                {view === 'queue' && <button className="outline" onClick={() => downloadCsv('hubspot-contacts.csv', crmExportRows(queueLeads))}>CRM export</button>}
                {view === 'queue' && <button className="primary" onClick={() => downloadCsv('acquisition-readiness-queue.csv', queueExportRows(queueLeads))}><ArrowDownToLine size={16} />Export {queueLeads.length}</button>}
              </div>
            </section>
            <section className="work">
              <LeadTable
                leads={visible}
                selected={selected}
                setSelected={setSelectedId}
                title={view === 'queue' ? 'Prioritized outreach queue' : 'Lead universe'}
                discovery={view === 'discovery'}
                toggleQueue={toggleQueue}
                totalCount={allVisible.length}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                useVirtualScroll={useVirtualScroll}
                virtualOffset={virtualOffset}
                totalHeight={allVisible.length * rowHeight}
                onScroll={setScrollTop}
                tableRef={tableRef}
              />
              <Detail lead={selected ?? visible[0] ?? null} icp={icp} />
            </section>
          </>
        )}
        <p className="foot">Demo only: supplied records and deterministic scoring. Connect compliant, licensed enrichment sources in production.</p>
      </main>
      <nav className="mobile-nav"><Nav view={view} setView={setView} /></nav>
    </div>
  )
}

function Nav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <>
      {([['queue', Sparkles, 'Readiness queue'], ['discovery', Search, 'Lead discovery'], ['imports', FileUp, 'Imports']] as const).map(([id, Icon, label]) => (
        <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
          <Icon size={17} />{label}
        </button>
      ))}
    </>
  )
}

function IcpEditor({ icp, update, reset }: { icp: Icp; update: <K extends keyof Icp>(key: K, value: Icp[K]) => void; reset: () => void }) {
  const validation = validateIcp(icp)
  
  return (
    <section className="icp">
      <div className="icp-heading">
        <label>ACTIVE ACQUISITION PROFILE</label>
        <p>Changes apply to the score immediately and stay in this browser.</p>
      </div>
      <label>Industries<input value={icp.industries.join(', ')} onChange={(event) => update('industries', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></label>
      <label>Geography<input value={icp.locations.join(', ')} onChange={(event) => update('locations', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} /></label>
      <label>Min revenue<input type="number" min="0" value={icp.minRevenue} onChange={(event) => update('minRevenue', toNumber(event.target.value))} /></label>
      <label>Max revenue<input type="number" min="0" value={icp.maxRevenue} onChange={(event) => update('maxRevenue', toNumber(event.target.value))} /></label>
      <label>Min employees<input type="number" min="0" value={icp.minEmployees} onChange={(event) => update('minEmployees', toNumber(event.target.value))} /></label>
      <label>Max employees<input type="number" min="0" value={icp.maxEmployees} onChange={(event) => update('maxEmployees', toNumber(event.target.value))} /></label>
      {!validation.valid && (
        <div className="icp-errors">
          {validation.errors.map((error, i) => <small key={i}>{error}</small>)}
        </div>
      )}
      <button onClick={reset}>Reset profile</button>
    </section>
  )
}

function ImportScreen({ openImport }: { openImport: () => void }) {
  return (
    <section className="import-screen">
      <FileUp size={30} />
      <h2>Import a company list</h2>
      <p>Upload a CSV. Existing queue membership is preserved, matching websites are merged, and every record is scored against the live ICP.</p>
      <button className="primary" onClick={openImport}><FileUp size={16} />Choose CSV file</button>
      <small>Required headers: company, website, industry, location, revenue, employees, contactName, contactTitle, email, phone, lastUpdated</small>
    </section>
  )
}

function LeadTable({ leads, selected, setSelected, title, discovery, toggleQueue, totalCount, currentPage, totalPages, onPageChange, useVirtualScroll, virtualOffset, totalHeight, onScroll, tableRef }: {
  leads: ScoredLead[]
  selected: ScoredLead | null
  setSelected: (id: string) => void
  title: string
  discovery: boolean
  toggleQueue: (lead: ScoredLead) => void
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  useVirtualScroll: boolean
  virtualOffset: number
  totalHeight: number
  onScroll: (scrollTop: number) => void
  tableRef: React.RefObject<HTMLDivElement | null>
}) {
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (useVirtualScroll) {
      onScroll(event.currentTarget.scrollTop)
    }
  }

  return (
    <div className="table">
      <div className="table-title">
        <div>
          <h2>{title}</h2>
          <p>{discovery ? 'Review every record, then deliberately add candidates to your working queue.' : 'Scores are transparent and update with your ICP.'}</p>
        </div>
        <span>{totalCount} results</span>
      </div>
      <div 
        className="table-overflow" 
        ref={tableRef}
        onScroll={handleScroll}
        style={useVirtualScroll ? { height: '600px', overflowY: 'auto' } : {}}
      >
        <div style={useVirtualScroll ? { height: `${totalHeight}px`, position: 'relative' } : {}}>
          <table style={useVirtualScroll ? { position: 'absolute', top: `${virtualOffset}px`, width: '100%' } : {}}>
            <thead>
              <tr>
                <th>Company</th>
                <th>{discovery ? 'Profile fit' : 'Fit score'}</th>
                <th>Why it ranks</th>
                <th>{discovery ? 'Queue' : 'Next action'}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} onClick={() => setSelected(lead.id)} className={selected?.id === lead.id ? 'selected' : ''}>
                  <td>
                    <b>{lead.company}</b>
                    <span>{lead.industry} · {lead.location}</span>
                  </td>
                  <td><i className={`score ${scoreClass(lead.score)}`}>{lead.score}</i></td>
                  <td>
                    <span>{lead.factors.filter((factor) => factor.points === factor.max).slice(0, 2).map((factor) => factor.label).join(' · ') || 'Needs review'}</span>
                    {lead.flags[0] && <small>{lead.flags[0]}</small>}
                  </td>
                  <td>
                    {discovery ? (
                      <button className={lead.inQueue ? 'queue-button added' : 'queue-button'} onClick={(event) => { event.stopPropagation(); toggleQueue(lead) }}>
                        {lead.inQueue ? 'Remove' : 'Add to queue'}
                      </button>
                    ) : (
                      <Status s={lead.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!leads.length && <div className="empty">No leads match these filters.</div>}
      </div>
      {!useVirtualScroll && totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="outline"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="outline"
          >
            Next
          </button>
        </div>
      )}
      {useVirtualScroll && (
        <div className="virtual-scroll-info">
          <small>Virtual scrolling enabled for performance ({totalCount} items)</small>
        </div>
      )}
    </div>
  )
}

function Metric({ l, v, c, type = '' }: { l: string; v: string; c: string; type?: string }) {
  return <article className={`metric ${type}`}><p>{l}</p><strong>{v}</strong><span>{c}</span></article>
}

function Status({ s }: { s: ScoredLead['status'] }) {
  return <span className={`status ${s.replace(/ /g, '-').toLowerCase()}`}>{s}</span>
}

function Detail({ lead, icp }: { lead: ScoredLead | null; icp: Icp }) {
  const [copied, setCopied] = useState<string | null>(null)
  if (!lead) return <aside className="detail empty">Select a lead to understand its score.</aside>
  const draft = draftOutreach(lead, icp)
  const copy = async (label: string, value: string) => {
    await copyText(value)
    setCopied(label)
  }
  return (
    <aside className="detail">
      <div className="detail-top">
        <div>
          <label>LEAD EXPLANATION</label>
          <h2>{lead.company}</h2>
          <p>{lead.contactName ?? 'No owner identified'}{lead.contactTitle && ` · ${lead.contactTitle}`}</p>
        </div>
        <i className={`score big ${scoreClass(lead.score)}`}>{lead.score}</i>
      </div>
      <Status s={lead.status} />
      <p className="meta">{formatMoney(lead.revenue)} revenue · {lead.employees ?? '—'} employees · {lead.website || 'no website'}</p>
      <section>
        <h3>Score breakdown</h3>
        {lead.factors.map((factor) => (
          <div className="factor" key={factor.label}>
            <div><span>{factor.label}</span><b>+{factor.points}</b></div>
            <progress value={factor.points} max={factor.max} />
            <small>{factor.detail}</small>
          </div>
        ))}
      </section>
      <section>
        <h3>Quality flags</h3>
        {lead.flags.length ? <div className="flags">{lead.flags.map((flag) => <span key={flag}>{flag}</span>)}</div> : <p className="clean">No critical data-quality flags.</p>}
      </section>
      <section>
        <h3>Contact route</h3>
        <p>{lead.email ?? 'No email available'}</p>
        <p>{lead.phone ?? 'No phone available'}</p>
      </section>
      <section>
        <div className="section-head">
          <h3>First-touch draft</h3>
          <button className="ghost" onClick={() => copy('email', `${draft.subject}\n\n${draft.body}`)}>{copied === 'email' ? 'Copied' : 'Copy email'}</button>
        </div>
        <p className="subject">{draft.subject}</p>
        <pre>{draft.body}</pre>
        <ul>{draft.talkingPoints.map((point) => <li key={point}>{point}</li>)}</ul>
      </section>
    </aside>
  )
}
