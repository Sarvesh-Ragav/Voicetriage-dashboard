import { useMemo } from 'react'
import { AlertTriangle, TrendingUp, Users, Activity, Clock, MapPin } from 'lucide-react'
import type { Case } from '../types'
import { WORKER_NAMES } from '../lib/data'
import StatCard from '../components/shared/StatCard'
import TriageBadge from '../components/shared/TriageBadge'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts'

interface Props {
    cases: Case[]
    todayCases: Case[]
    criticalCases: Case[]
    urgentCases: Case[]
    routineCases: Case[]
    loading: boolean
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

function getHourlyData(cases: Case[]) {
    const hours: Record<number, { critical: number; urgent: number; routine: number }> = {}
    for (let i = 0; i < 12; i++) {
        const hour = new Date()
        hour.setHours(hour.getHours() - (11 - i), 0, 0, 0)
        hours[i] = { critical: 0, urgent: 0, routine: 0 }
    }
    cases.forEach(c => {
        const caseTime = new Date(c.created_at)
        const now = new Date()
        const hoursAgo = Math.floor((now.getTime() - caseTime.getTime()) / 3600000)
        if (hoursAgo < 12) {
            const index = 11 - hoursAgo
            if (index >= 0 && index < 12) {
                const level = c.triage_level?.toLowerCase() as 'critical' | 'urgent' | 'routine'
                if (level && hours[index]) hours[index][level]++
            }
        }
    })
    return Object.values(hours).map((h, i) => {
        const hour = new Date()
        hour.setHours(hour.getHours() - (11 - i))
        return {
            time: hour.getHours() + ':00',
            ...h,
            total: h.critical + h.urgent + h.routine,
        }
    })
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-surface border border-border rounded-lg p-3 text-xs">
            <p className="text-textSecondary mb-2">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }} className="font-medium">
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    )
}

export default function CommandHome({ cases, todayCases, criticalCases, urgentCases, routineCases, loading }: Props) {
    const hourlyData = useMemo(() => getHourlyData(cases), [cases])

    const recentCases = useMemo(() =>
        [...cases]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8),
        [cases]
    )

    const activeWorkers = useMemo(() => {
        const workerMap: Record<string, { count: number; lastCase: Case }> = {}
        todayCases.forEach(c => {
            if (!c.worker_id) return
            if (!workerMap[c.worker_id]) {
                workerMap[c.worker_id] = { count: 0, lastCase: c }
            }
            workerMap[c.worker_id].count++
            if (new Date(c.created_at) > new Date(workerMap[c.worker_id].lastCase.created_at)) {
                workerMap[c.worker_id].lastCase = c
            }
        })
        return Object.entries(workerMap)
            .map(([id, data]) => ({ id, name: WORKER_NAMES[id] || id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    }, [todayCases])

    const outbreakRisk = useMemo(() => {
        const villageMap: Record<string, number> = {}
        const recent48h = cases.filter(c => {
            const h = (Date.now() - new Date(c.created_at).getTime()) / 3600000
            return h < 48 && (c.triage_level === 'CRITICAL' || c.triage_level === 'URGENT')
        })
        recent48h.forEach(c => {
            if (c.village) villageMap[c.village] = (villageMap[c.village] || 0) + 1
        })
        return Object.entries(villageMap)
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([village, count]) => ({ village, count }))
    }, [cases])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-textSecondary text-sm">Loading district data...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 min-h-screen">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-textPrimary">Command Home</h1>
                    <p className="text-textSecondary text-sm mt-1">
                        District health overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-routineLight border border-routine rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-routine animate-pulse" />
                    <span className="text-routine text-xs font-semibold">Live · Updates in real time</span>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Critical" value={criticalCases.length} color="critical" sublabel="Need immediate action" />
                <StatCard label="Urgent" value={urgentCases.length} color="urgent" sublabel="PHC within 4 hours" />
                <StatCard label="Routine" value={routineCases.length} color="routine" sublabel="Home care advised" />
                <StatCard label="Total Today" value={todayCases.length} color="neutral" sublabel={`${cases.length} total cases`} />
            </div>

            {outbreakRisk.length > 0 && (
                <div className="bg-criticalLight border border-critical rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-critical" />
                        <span className="text-critical font-semibold text-sm uppercase tracking-wider">Outbreak Risk Detected</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {outbreakRisk.map(({ village, count }) => (
                            <div key={village} className="flex items-center gap-2 bg-[#1A0A0A] border border-critical rounded-lg px-3 py-2">
                                <MapPin size={12} className="text-critical" />
                                <span className="text-textPrimary text-sm font-medium">{village}</span>
                                <span className="text-critical text-xs font-bold">{count} cases in 48h</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={16} className="text-primary" />
                        <h2 className="text-textPrimary font-semibold">Case Activity — Last 12 Hours</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E24B4A" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#E24B4A" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="urgentGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF9F27" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#EF9F27" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="routineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                            <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="critical" name="Critical" stroke="#E24B4A" fill="url(#criticalGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="urgent" name="Urgent" stroke="#EF9F27" fill="url(#urgentGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="routine" name="Routine" stroke="#1D9E75" fill="url(#routineGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={16} className="text-primary" />
                        <h2 className="text-textPrimary font-semibold">Top Active Workers</h2>
                    </div>
                    {activeWorkers.length === 0 ? (
                        <p className="text-textSecondary text-sm">No activity today</p>
                    ) : (
                        <div className="space-y-3">
                            {activeWorkers.map((worker, i) => (
                                <div key={worker.id} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-routineLight border border-routine flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-textPrimary text-sm font-medium truncate">{worker.name}</p>
                                        <p className="text-textSecondary text-xs">{worker.count} cases · {formatTime(worker.lastCase.created_at)}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-routine flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-primary" />
                        <h2 className="text-textPrimary font-semibold">Recent Cases</h2>
                    </div>
                    <span className="text-textSecondary text-xs">Showing latest 8</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                                <th className="text-left pb-3 pr-4 font-medium">Patient</th>
                                <th className="text-left pb-3 pr-4 font-medium">Complaint</th>
                                <th className="text-left pb-3 pr-4 font-medium">Village</th>
                                <th className="text-left pb-3 pr-4 font-medium">Triage</th>
                                <th className="text-left pb-3 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {recentCases.map(c => (
                                <tr key={c.id} className="hover:bg-surfaceLight transition-colors">
                                    <td className="py-3 pr-4">
                                        <div>
                                            <p className="text-textPrimary font-medium">{c.patient_name || 'Unknown'}</p>
                                            <p className="text-textSecondary text-xs">{c.patient_age ? c.patient_age + ' yrs' : ''} {c.patient_gender || ''}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <p className="text-textSecondary truncate max-w-[160px]">{c.chief_complaint || '—'}</p>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={10} className="text-textSecondary" />
                                            <span className="text-textSecondary">{c.village || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <TriageBadge level={c.triage_level} size="sm" />
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-1 text-textSecondary">
                                            <Clock size={10} />
                                            <span>{formatTime(c.created_at)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
