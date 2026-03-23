import { useMemo, useState } from 'react'
import { Search, ArrowUpDown, Download, CheckCircle, AlertTriangle, XCircle, MapPin, Clock, Activity, ShieldAlert } from 'lucide-react'
import type { Case } from '../types'
import { WORKER_NAMES } from '../lib/data'
import TriageBadge from '../components/shared/TriageBadge'
import StatCard from '../components/shared/StatCard'

interface Props {
    cases: Case[]
    todayCases: Case[]
}

type WorkerStats = {
    id: string
    name: string
    totalCases: number
    todayCases: number
    weekCases: number
    critical: number
    urgent: number
    routine: number
    lastActive: string
    status: 'active' | 'warning' | 'inactive'
    score: number
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function formatTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return date.toLocaleDateString()
}

export default function ASHAWorkforce({ cases, todayCases }: Props) {
    const [workerSearch, setWorkerSearch] = useState('')
    const [workerFilter, setWorkerFilter] = useState<'ALL' | 'active' | 'warning' | 'inactive'>('ALL')
    const [workerSort, setWorkerSort] = useState<'cases' | 'critical' | 'recent' | 'name'>('cases')

    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

    const [caseSearch, setCaseSearch] = useState('')
    const [caseSortField, setCaseSortField] = useState<'time' | 'name' | 'village' | 'triage'>('time')
    const [caseSortAsc, setCaseSortAsc] = useState(false)

    // Compute worker statistics
    const workers = useMemo(() => {
        const map: Record<string, WorkerStats> = {}
        const now = new Date().getTime()

        cases.forEach(c => {
            if (!c.worker_id) return
            if (!map[c.worker_id]) {
                map[c.worker_id] = {
                    id: c.worker_id,
                    name: WORKER_NAMES[c.worker_id] || c.worker_id,
                    totalCases: 0,
                    todayCases: 0,
                    weekCases: 0,
                    critical: 0,
                    urgent: 0,
                    routine: 0,
                    lastActive: c.created_at,
                    status: 'inactive',
                    score: 0
                }
            }

            const w = map[c.worker_id]
            w.totalCases++

            const cTime = new Date(c.created_at).getTime()
            if (cTime > new Date(w.lastActive).getTime()) w.lastActive = c.created_at

            const hoursAgo = (now - cTime) / 3600000
            if (hoursAgo < 24) w.todayCases++
            if (hoursAgo < 168) w.weekCases++

            if (c.triage_level === 'CRITICAL') w.critical++
            else if (c.triage_level === 'URGENT') w.urgent++
            else w.routine++
        })

        return Object.values(map).map(w => {
            const hoursSinceActive = (now - new Date(w.lastActive).getTime()) / 3600000
            w.status = hoursSinceActive <= 6 ? 'active' : hoursSinceActive <= 24 ? 'warning' : 'inactive'

            const rawScore = w.totalCases > 0 ? ((w.routine * 1 + w.urgent * 2 + w.critical * 3) / w.totalCases) * 10 : 0
            w.score = Number(rawScore.toFixed(1))

            return w
        })
    }, [cases])

    // Filter and sort workers
    const filteredWorkers = useMemo(() => {
        let list = workers.filter(w =>
            (workerFilter === 'ALL' || w.status === workerFilter) &&
            w.name.toLowerCase().includes(workerSearch.toLowerCase())
        )
        list.sort((a, b) => {
            if (workerSort === 'cases') return b.totalCases - a.totalCases
            if (workerSort === 'critical') return b.critical - a.critical
            if (workerSort === 'recent') return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
            if (workerSort === 'name') return a.name.localeCompare(b.name)
            return 0
        })
        return list
    }, [workers, workerSearch, workerFilter, workerSort])

    // Summary stats
    const summary = {
        total: workers.length,
        activeToday: workers.filter(w => w.status === 'active' || w.status === 'warning').length,
        inactive3Days: workers.filter(w => {
            const h = (new Date().getTime() - new Date(w.lastActive).getTime()) / 3600000
            return h > 72
        }).length,
        casesToday: todayCases.length
    }

    // Filter and sort cases table
    const tableCases = useMemo(() => {
        let list = cases.filter(c => {
            if (selectedWorkerId && c.worker_id !== selectedWorkerId) return false
            const search = caseSearch.toLowerCase()
            if (search && !c.patient_name?.toLowerCase().includes(search) && !c.village?.toLowerCase().includes(search)) return false
            return true
        })

        list.sort((a, b) => {
            let valA: any = a.created_at, valB: any = b.created_at
            if (caseSortField === 'name') { valA = a.patient_name || ''; valB = b.patient_name || '' }
            else if (caseSortField === 'village') { valA = a.village || ''; valB = b.village || '' }
            else if (caseSortField === 'triage') { valA = a.triage_level || ''; valB = b.triage_level || '' }

            if (valA < valB) return caseSortAsc ? -1 : 1
            if (valA > valB) return caseSortAsc ? 1 : -1
            return 0
        })
        return list
    }, [cases, selectedWorkerId, caseSearch, caseSortField, caseSortAsc])

    const toggleSort = (field: 'time' | 'name' | 'village' | 'triage') => {
        if (caseSortField === field) setCaseSortAsc(!caseSortAsc)
        else { setCaseSortField(field); setCaseSortAsc(true) }
    }

    const exportData = () => {
        alert("Export feature coming soon")
    }

    return (
        <div className="flex flex-col h-full bg-[#0F1117] overflow-y-auto">
            {/* HEADER */}
            <div className="flex-shrink-0 border-b border-border bg-surface px-8 py-6">
                <h1 className="text-2xl font-bold text-textPrimary mb-1">ASHA Workforce</h1>
                <p className="text-sm text-textSecondary">All workers across the district ranked, scored, and monitored</p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <StatCard label="Total Workers" value={summary.total} color="neutral" />
                    <StatCard label="Active Today" value={summary.activeToday} color="routine" />
                    <StatCard label="Inactive 3+ Days" value={summary.inactive3Days} color="critical" sublabel="Requires attention" />
                    <StatCard label="Total Cases Today" value={summary.casesToday} color="routine" />
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* WORKER CONTROLS */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-4 rounded-xl border border-border">
                    <div className="relative w-full lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
                        <input
                            type="text"
                            placeholder="Search workers..."
                            value={workerSearch}
                            onChange={(e) => setWorkerSearch(e.target.value)}
                            className="w-full bg-[#0F1117] border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                        <div className="flex items-center bg-[#0F1117] rounded-lg border border-border p-1">
                            {(['ALL', 'active', 'warning', 'inactive'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setWorkerFilter(f)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${workerFilter === f
                                            ? f === 'active' ? 'bg-routine text-white' : f === 'warning' ? 'bg-urgent text-white' : f === 'inactive' ? 'bg-critical text-white' : 'bg-border text-white'
                                            : 'text-textSecondary hover:text-white'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <select
                            value={workerSort}
                            onChange={(e: any) => setWorkerSort(e.target.value)}
                            className="bg-[#0F1117] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                            <option value="cases">Most Cases Total</option>
                            <option value="critical">Most Critical Cases</option>
                            <option value="recent">Recently Active</option>
                            <option value="name">Name A-Z</option>
                        </select>
                    </div>
                </div>

                {/* WORKER GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkers.map(w => {
                        const statusConfig = {
                            active: { color: 'bg-routine', text: 'text-routine', border: 'border-routine', label: 'Active', icon: CheckCircle },
                            warning: { color: 'bg-urgent', text: 'text-urgent', border: 'border-urgent', label: 'Check in', icon: AlertTriangle },
                            inactive: { color: 'bg-critical', text: 'text-critical', border: 'border-critical', label: 'Inactive', icon: XCircle }
                        }
                        const st = statusConfig[w.status]
                        const StatusIcon = st.icon

                        const criticalPct = w.totalCases ? (w.critical / w.totalCases) * 100 : 0
                        const urgentPct = w.totalCases ? (w.urgent / w.totalCases) * 100 : 0
                        const routinePct = w.totalCases ? (w.routine / w.totalCases) * 100 : 0

                        return (
                            <div key={w.id} className="group relative bg-surface border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(29,158,117,0.1)] transition-all overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#112F22] border border-primary/30 flex items-center justify-center text-primary font-bold">
                                            {getInitials(w.name)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-textPrimary">{w.name}</h3>
                                            <div className="flex items-center gap-1 text-xs">
                                                <Clock size={10} className="text-textSecondary" />
                                                <span className="text-textSecondary">{formatTime(w.lastActive)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${st.border} bg-opacity-10 text-xs font-semibold ${st.text}`}>
                                        <StatusIcon size={12} />
                                        {st.label}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-textSecondary uppercase tracking-wider">Today</span>
                                        <span className={`text-xl font-bold ${w.todayCases > 0 ? 'text-primary' : 'text-textPrimary'}`}>{w.todayCases}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-textSecondary uppercase tracking-wider">Week</span>
                                        <span className="text-xl font-bold text-textPrimary">{w.weekCases}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-textSecondary uppercase tracking-wider">Total</span>
                                        <span className="text-xl font-bold text-textPrimary">{w.totalCases}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-textSecondary font-medium">Case Severity Ratio</span>
                                        <span className="text-textPrimary font-bold">{w.score} <span className="text-[10px] text-textSecondary font-normal uppercase">Score</span></span>
                                    </div>
                                    <div className="h-2 w-full flex rounded-full overflow-hidden bg-[#0F1117]">
                                        <div style={{ width: `${criticalPct}%` }} className="bg-critical h-full" title={`Critical: ${w.critical}`} />
                                        <div style={{ width: `${urgentPct}%` }} className="bg-urgent h-full" title={`Urgent: ${w.urgent}`} />
                                        <div style={{ width: `${routinePct}%` }} className="bg-routine h-full" title={`Routine: ${w.routine}`} />
                                    </div>
                                    <div className="flex gap-3 mt-1.5 text-[10px]">
                                        <span className="text-critical">{w.critical} Cri</span>
                                        <span className="text-urgent">{w.urgent} Urg</span>
                                        <span className="text-routine">{w.routine} Rou</span>
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-surface/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            setSelectedWorkerId(selectedWorkerId === w.id ? null : w.id)
                                            document.getElementById('cases-table')?.scrollIntoView({ behavior: 'smooth' })
                                        }}
                                        className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-transform transform scale-95 group-hover:scale-100 flex items-center gap-2 shadow-lg"
                                    >
                                        <Activity size={16} />
                                        {selectedWorkerId === w.id ? 'Hide Cases' : 'View Cases'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filteredWorkers.length === 0 && (
                        <div className="col-span-full py-12 text-center text-textSecondary bg-surface border border-border rounded-xl">
                            No workers match the current filters.
                        </div>
                    )}
                </div>

                {/* CASES TABLE */}
                <div id="cases-table" className="bg-surface border border-border rounded-xl overflow-hidden mt-8">
                    <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-primary" size={20} />
                            <h2 className="text-lg font-bold text-textPrimary">
                                {selectedWorkerId ? `${WORKER_NAMES[selectedWorkerId] || selectedWorkerId}'s Cases` : 'All District Cases'}
                            </h2>
                            <span className="px-2 py-0.5 ml-2 bg-[#0F1117] border border-border rounded-full text-xs text-textSecondary font-semibold">
                                {tableCases.length} records
                            </span>
                            {selectedWorkerId && (
                                <button onClick={() => setSelectedWorkerId(null)} className="ml-2 text-xs text-primary hover:underline">
                                    Clear filter
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={14} />
                                <input
                                    type="text"
                                    placeholder="Filter cases..."
                                    value={caseSearch}
                                    onChange={(e) => setCaseSearch(e.target.value)}
                                    className="w-full bg-[#0F1117] border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <button onClick={exportData} className="flex items-center gap-2 bg-[#0F1117] hover:bg-surfaceLight border border-border px-3 py-1.5 rounded-lg text-sm font-semibold text-textPrimary transition-colors">
                                <Download size={14} />
                                Export
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0F1117] border-b border-border text-textSecondary text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold cursor-pointer hover:text-white group" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1">Patient Name <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold">Complaint <span className="text-[10px] text-border normal-case ml-1">(No sort)</span></th>
                                    <th className="text-left py-3 px-4 font-semibold cursor-pointer hover:text-white group" onClick={() => toggleSort('triage')}>
                                        <div className="flex items-center gap-1">Triage <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold cursor-pointer hover:text-white group" onClick={() => toggleSort('village')}>
                                        <div className="flex items-center gap-1">Village <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold cursor-pointer hover:text-white group" onClick={() => toggleSort('time')}>
                                        <div className="flex items-center gap-1">Time <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {tableCases.slice(0, 100).map(c => (
                                    <tr key={c.id} className="hover:bg-surfaceLight transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-textPrimary">{c.patient_name || 'Unknown'}</div>
                                            <div className="text-xs text-textSecondary mt-0.5">{c.patient_age} yrs • {c.patient_gender}</div>
                                        </td>
                                        <td className="py-3 px-4 text-textSecondary max-w-xs truncate" title={c.chief_complaint || ''}>
                                            {c.chief_complaint || '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <TriageBadge level={c.triage_level} size="sm" />
                                        </td>
                                        <td className="py-3 px-4 text-textSecondary">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} />
                                                {c.village || '—'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-textSecondary">
                                            {formatTime(c.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tableCases.length > 100 && (
                            <div className="py-3 text-center text-xs text-textSecondary bg-[#0F1117] border-t border-border">
                                Showing top 100 of {tableCases.length} records. Use filters to narrow down.
                            </div>
                        )}
                        {tableCases.length === 0 && (
                            <div className="py-12 text-center text-textSecondary">
                                No cases match the current filters.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
