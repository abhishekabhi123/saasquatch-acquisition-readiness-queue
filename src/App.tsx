import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { ArrowDownToLine, CircleAlert, FileUp, Search, Settings2, Sparkles, X } from 'lucide-react'
import { defaultIcp, demoLeads } from './data'
import { scoreLeads } from './scoring'
import type { Icp, Lead, ScoredLead } from './types'

type View = 'queue' | 'discovery' | 'imports'
const statuses = ['All leads', 'Ready to contact', 'Research first', 'Enrich first', 'Deprioritize'] as const
const scoreClass = (score: number) => score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'
const toNumber = (value: string) => Number(value) || 0

function parseCsv(text: string): Lead[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim() })
  if (result.errors.length) throw new Error(result.errors[0].message)
  return result.data.filter((row) => row.company?.trim()).map((row, index) => ({
    id: `import-${Date.now()}-${index}`, company: row.company.trim(), website: row.website?.trim() ?? '', industry: row.industry?.trim() ?? '', location: row.location?.trim() ?? '',
    revenue: toNumber(row.revenue), employees: toNumber(row.employees), contactName: row.contactName?.trim() || null, contactTitle: row.contactTitle?.trim() || null,
    email: row.email?.trim() || null, phone: row.phone?.trim() || null, lastUpdated: row.lastUpdated?.trim() || null, inQueue: false,
  }))
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(demoLeads)
  const [icp, setIcp] = useState<Icp>(defaultIcp)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<(typeof statuses)[number]>('All leads')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showIcp, setShowIcp] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useState<View>('queue')
  const [strictIcp, setStrictIcp] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { fetch('/api/leads').then((response) => response.ok ? response.json() : []).then((records: Lead[]) => { if (records.length) setLeads(records) }).catch(() => undefined) }, [])

  const scored = useMemo(() => scoreLeads(leads, icp), [leads, icp])
  const discoveryLeads = scored.filter((lead) => `${lead.company} ${lead.industry} ${lead.location}`.toLowerCase().includes(query.toLowerCase()))
  const queueLeads = discoveryLeads.filter((lead) => lead.inQueue && (status === 'All leads' || lead.status === status) && (!strictIcp || lead.score >= 55))
  const ready = scored.filter((lead) => lead.inQueue && lead.status === 'Ready to contact').length
  const duplicates = scored.filter((lead) => lead.isDuplicate).length
  const selected = scored.find((lead) => lead.id === selectedId) ?? null

  const updateIcp = <K extends keyof Icp>(key: K, value: Icp[K]) => setIcp((current) => ({ ...current, [key]: value }))
  const openImport = () => input.current?.click()
  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const records = parseCsv(String(reader.result))
        if (!records.length) throw new Error('No lead rows found')
        setLeads(records); setSelectedId(null)
        fetch('/api/leads/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads: records }) }).catch(() => undefined)
        setNotice(`Imported ${records.length} leads. Your queue was recalculated and saved.`)
        setView('queue')
      } catch { setNotice('Could not read that CSV. Download or follow the template headers in demo-leads.csv.') }
    }
    reader.readAsText(file); event.target.value = ''
  }
  const exportCsv = () => {
    const rows = [['Company', 'Industry', 'Location', 'Score', 'Action', 'Email', 'Flags'], ...queueLeads.map((lead) => [lead.company, lead.industry, lead.location, lead.score, lead.status, lead.email ?? '', lead.flags.join('; ')])]
    const csv = Papa.unparse(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'acquisition-readiness-queue.csv'; link.click(); URL.revokeObjectURL(url)
  }

  const title = view === 'queue' ? 'Readiness queue' : view === 'discovery' ? 'Lead discovery' : 'Import leads'
  const subtitle = view === 'queue' ? 'Turn a raw lead list into a focused outreach plan.' : view === 'discovery' ? 'Explore the lead universe before choosing who deserves outreach.' : 'Bring a spreadsheet into a scored, actionable workspace.'

  return <div className="app"><aside>
    <div className="brand"><b>S</b><div><strong>SaaSquatch</strong><span>ACQUISITION QUEUE</span></div></div>
    <nav>{([['queue', Sparkles, 'Readiness queue'], ['discovery', Search, 'Lead discovery'], ['imports', FileUp, 'Imports']] as const).map(([id, Icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={17}/>{label}</button>)}</nav>
    <footer><label>DEMO WORKSPACE</label><p>Prioritize the owners most likely to take your call.</p></footer>
  </aside><main>
    <header><div><label>ACQUISITION INTELLIGENCE</label><h1>{title}</h1><p>{subtitle}</p></div>{view !== 'imports' && <button className="icp-trigger" onClick={() => setShowIcp(!showIcp)}><Settings2 size={14}/>{showIcp ? 'Close ICP' : 'Edit ICP'}</button>}</header>
    {showIcp && <IcpEditor icp={icp} update={updateIcp} reset={() => setIcp(defaultIcp)} />}
    {notice && <div className="notice"><CircleAlert size={16}/>{notice}<button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15}/></button></div>}
    <input className="hide" ref={input} type="file" accept=".csv,text/csv" onChange={importCsv}/>
    {view === 'imports' ? <ImportScreen openImport={openImport} /> : <>
      {view === 'queue' && <section className="metrics"><Metric l="Queue candidates" v={`${queueLeads.length}`} c={strictIcp ? 'Strict ICP match enabled' : 'Saved for review'}/><Metric l="Ready to contact" v={`${ready}`} c="Reachable & in-profile" type="green"/><Metric l="Duplicate records" v={`${duplicates}`} c="Flagged by website" type="amber"/><Metric l="Avg. data quality" v={`${Math.round(scored.reduce((sum, lead) => sum + lead.completeness, 0) / scored.length || 0)}%`} c="Across discovery"/></section>}
      {view === 'discovery' && <div className="discovery-note"><Sparkles size={16}/><span>This is the raw lead universe. Add promising companies to the <b>Readiness queue</b> after a first pass.</span></div>}
      <section className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search companies, industries, locations…" value={query} onChange={(event) => setQuery(event.target.value)}/></div><div className="actions">{view === 'queue' && <label className="strict-toggle"><input type="checkbox" checked={strictIcp} onChange={(event) => setStrictIcp(event.target.checked)}/>ICP matches only</label>}{view === 'queue' && <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>}<button className="outline" onClick={openImport}><FileUp size={16}/>Import CSV</button>{view === 'queue' && <button className="primary" onClick={exportCsv}><ArrowDownToLine size={16}/>Export {queueLeads.length}</button>}</div></section>
      <section className="work"><LeadTable leads={view === 'queue' ? queueLeads : discoveryLeads} selected={selected} setSelected={setSelectedId} title={view === 'queue' ? 'Prioritized outreach queue' : 'Lead universe'} discovery={view === 'discovery'} toggleQueue={(lead) => { const inQueue = !lead.inQueue; setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, inQueue } : item)); fetch(`/api/leads/${lead.id}/queue`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inQueue }) }).catch(() => undefined) }} /><Detail lead={selected ?? (view === 'queue' ? queueLeads[0] : discoveryLeads[0]) ?? null}/></section>
    </>}
    <p className="foot">Demo only: supplied records and deterministic scoring. Connect compliant, licensed enrichment sources in production.</p>
  </main></div>
}

function IcpEditor({ icp, update, reset }: { icp: Icp; update: <K extends keyof Icp>(key: K, value: Icp[K]) => void; reset: () => void }) { return <section className="icp"><div className="icp-heading"><label>ACTIVE ACQUISITION PROFILE</label><p>Changes apply to the score immediately.</p></div><label>Industries<input value={icp.industries.join(', ')} onChange={(e) => update('industries', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}/></label><label>Geography<input value={icp.locations.join(', ')} onChange={(e) => update('locations', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}/></label><label>Min revenue<input type="number" value={icp.minRevenue} onChange={(e) => update('minRevenue', toNumber(e.target.value))}/></label><label>Max revenue<input type="number" value={icp.maxRevenue} onChange={(e) => update('maxRevenue', toNumber(e.target.value))}/></label><label>Min employees<input type="number" value={icp.minEmployees} onChange={(e) => update('minEmployees', toNumber(e.target.value))}/></label><label>Max employees<input type="number" value={icp.maxEmployees} onChange={(e) => update('maxEmployees', toNumber(e.target.value))}/></label><button onClick={reset}>Reset profile</button></section> }
function ImportScreen({ openImport }: { openImport: () => void }) { return <section className="import-screen"><FileUp size={30}/><h2>Import a company list</h2><p>Upload a CSV and every lead will be saved, quality-checked, and scored against your active ICP.</p><button className="primary" onClick={openImport}><FileUp size={16}/>Choose CSV file</button><small>Required headers: company, website, industry, location, revenue, employees, contactName, contactTitle, email, phone, lastUpdated</small></section> }
function LeadTable({ leads, selected, setSelected, title, discovery, toggleQueue }: { leads: ScoredLead[]; selected: ScoredLead | null; setSelected: (id: string) => void; title: string; discovery: boolean; toggleQueue: (lead: ScoredLead) => void }) { return <div className="table"><div className="table-title"><div><h2>{title}</h2><p>{discovery ? 'Review every record, then deliberately add candidates to your working queue.' : 'Scores are transparent and update with your ICP.'}</p></div><span>{leads.length} results</span></div><div className="table-overflow"><table><thead><tr><th>Company</th><th>{discovery ? 'Profile fit' : 'Fit score'}</th><th>Why it ranks</th><th>{discovery ? 'Queue' : 'Next action'}</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} onClick={() => setSelected(lead.id)} className={selected?.id === lead.id ? 'selected' : ''}><td><b>{lead.company}</b><span>{lead.industry} · {lead.location}</span></td><td><i className={`score ${scoreClass(lead.score)}`}>{lead.score}</i></td><td><span>{lead.factors.filter((factor) => factor.points === factor.max).slice(0, 2).map((factor) => factor.label).join(' · ') || 'Needs review'}</span>{lead.flags[0] && <small>{lead.flags[0]}</small>}</td><td>{discovery ? <button className={lead.inQueue ? 'queue-button added' : 'queue-button'} onClick={(event) => { event.stopPropagation(); toggleQueue(lead) }}>{lead.inQueue ? 'Remove' : 'Add to queue'}</button> : <Status s={lead.status}/>}</td></tr>)}</tbody></table>{!leads.length && <div className="empty">No leads match these filters.</div>}</div></div> }
function Metric({ l, v, c, type = '' }: { l: string; v: string; c: string; type?: string }) { return <article className={`metric ${type}`}><p>{l}</p><strong>{v}</strong><span>{c}</span></article> }
function Status({ s }: { s: ScoredLead['status'] }) { return <span className={`status ${s.replace(/ /g, '-').toLowerCase()}`}>{s}</span> }
function Detail({ lead }: { lead: ScoredLead | null }) { if (!lead) return <aside className="detail empty">Select a lead to understand its score.</aside>; return <aside className="detail"><div className="detail-top"><div><label>LEAD EXPLANATION</label><h2>{lead.company}</h2><p>{lead.contactName ?? 'No owner identified'}{lead.contactTitle && ` · ${lead.contactTitle}`}</p></div><i className={`score big ${scoreClass(lead.score)}`}>{lead.score}</i></div><Status s={lead.status}/><section><h3>Score breakdown</h3>{lead.factors.map((factor) => <div className="factor" key={factor.label}><div><span>{factor.label}</span><b>+{factor.points}</b></div><progress value={factor.points} max={factor.max}/><small>{factor.detail}</small></div>)}</section><section><h3>Quality flags</h3>{lead.flags.length ? <div className="flags">{lead.flags.map((flag) => <span key={flag}>{flag}</span>)}</div> : <p className="clean">No critical data-quality flags.</p>}</section><section><h3>Contact route</h3><p>{lead.email ?? 'No email available'}</p><p>{lead.phone ?? 'No phone available'}</p></section></aside> }
