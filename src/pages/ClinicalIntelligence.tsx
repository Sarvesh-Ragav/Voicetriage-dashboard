import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    AlertTriangle, ShieldCheck, MapPin, Map, Brain,
    Activity, Globe, Users, ChevronRight, CheckCircle2
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts'
import type { Case } from '../types'
import { WORKER_NAMES } from '../lib/data'

interface Props {
    cases: Case[]
}

function formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
}

const COLORS = {
    CRITICAL: '#E24B4A',
    URGENT: '#EF9F27',
    ROUTINE: '#1D9E75'
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-surface border border-border rounded-lg p-3 text-xs shadow-xl z-50">
            <p className="text-textSecondary mb-2 font-medium">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color || p.fill }} className="font-medium flex items-center justify-between gap-4">
                    <span>{p.name}:</span>
                    <span>{p.value}</span>
                </p>
            ))}
        </div>
    )
}

export default function ClinicalIntelligence({ cases }: Props) {
    const [referredCases, setReferredCases] = useState<Record<string, boolean>>({})

    // SECTION 1: Outbreak Detection (Last 48h, CRITICAL/URGENT, group by village)
    const outbreakClusters = useMemo(() => {
        const map: Record<string, { count: number; complaints: Set<string>; times: number[]; cases: Case[] }> = {}
        const now = Date.now()

        cases.forEach(c => {
            const time = new Date(c.created_at).getTime()
            const hoursAgo = (now - time) / 3600000

            if (hoursAgo <= 48 && (c.triage_level === 'CRITICAL' || c.triage_level === 'URGENT') && c.village) {
                if (!map[c.village]) {
                    map[c.village] = { count: 0, complaints: new Set(), times: [], cases: [] }
                }
                map[c.village].count++
                if (c.chief_complaint) map[c.village].complaints.add(c.chief_complaint.toLowerCase())
                map[c.village].times.push(time)
                map[c.village].cases.push(c)
            }
        })

        return Object.entries(map)
            .filter(([, data]) => data.count >= 2)
            .map(([village, data]) => {
                data.times.sort((a, b) => a - b)
                return {
                    village,
                    count: data.count,
                    complaints: Array.from(data.complaints).slice(0, 3).join(', '),
                    firstCaseDt: new Date(data.times[0]).toISOString(),
                    lastCaseDt: new Date(data.times[data.times.length - 1]).toISOString(),
                    level: data.count >= 3 ? 'high' : 'watch'
                }
            })
            .sort((a, b) => b.count - a.count)
    }, [cases])

    // SECTION 2.1: Symptom Trend (Top 10 complaints)
    const symptomData = useMemo(() => {
        const map: Record<string, { count: number; levels: Record<string, number> }> = {}
        cases.forEach(c => {
            if (!c.chief_complaint) return
            const comp = c.chief_complaint.toLowerCase().trim()
            if (!map[comp]) map[comp] = { count: 0, levels: { CRITICAL: 0, URGENT: 0, ROUTINE: 0 } }
            map[comp].count++
            if (c.triage_level) map[comp].levels[c.triage_level]++
        })

        return Object.entries(map)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, data]) => {
                let dominant = 'ROUTINE'
                let max = data.levels.ROUTINE
                if (data.levels.URGENT > max) { dominant = 'URGENT'; max = data.levels.URGENT }
                if (data.levels.CRITICAL > max) { dominant = 'CRITICAL' }
                return {
                    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                    count: data.count,
                    fill: COLORS[dominant as keyof typeof COLORS] || COLORS.ROUTINE
                }
            })
    }, [cases])

    // SECTION 2.2: Triage Distribution
    const triageData = useMemo(() => {
        const counts = { CRITICAL: 0, URGENT: 0, ROUTINE: 0 }
        cases.forEach(c => {
            if (c.triage_level) counts[c.triage_level as keyof typeof counts]++
        })
        return [
            { name: 'CRITICAL', value: counts.CRITICAL, fill: COLORS.CRITICAL },
            { name: 'URGENT', value: counts.URGENT, fill: COLORS.URGENT },
            { name: 'ROUTINE', value: counts.ROUTINE, fill: COLORS.ROUTINE }
        ]
    }, [cases])

    // SECTION 3.1: Language Breakdown
    const languageData = useMemo(() => {
        const map: Record<string, number> = {}
        cases.forEach(c => {
            const l = c.language_code || 'ta-IN'
            map[l] = (map[l] || 0) + 1
        })
        const total = cases.length || 1
        return Object.entries(map).map(([lang, count]) => {
            let name = lang
            if (lang.includes('hi')) name = 'Hindi'
            else if (lang.includes('ta')) name = 'Tamil'
            else if (lang.includes('en')) name = 'English'
            return { name, count, pct: Math.round((count / total) * 100) }
        }).sort((a, b) => b.count - a.count)
    }, [cases])

    // SECTION 3.2: Geographic Spread (Top 5 villages)
    const topVillages = useMemo(() => {
        const map: Record<string, number> = {}
        cases.forEach(c => {
            const v = c.village || 'Unknown'
            map[v] = (map[v] || 0) + 1
        })
        const total = cases.length || 1
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([village, count]) => ({ village, count, pct: (count / total) * 100 }))
    }, [cases])

    // SECTION 5: 7 Day Trend
    const sevenDayTrend = useMemo(() => {
        const days: Record<string, { CRITICAL: number; URGENT: number; ROUTINE: number }> = {}

        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            days[dateStr] = { CRITICAL: 0, URGENT: 0, ROUTINE: 0 }
        }

        cases.forEach(c => {
            const d = new Date(c.created_at)
            const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            if (days[dateStr] && c.triage_level) {
                days[dateStr][c.triage_level as 'CRITICAL']++
            }
        })

        return Object.entries(days).map(([date, counts]) => ({ date, ...counts }))
    }, [cases])

    // SECTION 4: High Risk Patients (CRITICAL cases)
    const highRiskCases = useMemo(() => {
        return cases
            .filter(c => c.triage_level === 'CRITICAL')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [cases])

    return (
        <div className="flex flex-col h-full bg-[#0F1117] overflow-y-auto page-transition">

            {/* HEADER */}
            <div className="flex-shrink-0 border-b border-border bg-surface px-8 py-6">
                <div className="flex items-center gap-3">
                    <Brain className="text-primary" size={28} />
                    <div>
                        <h1 className="text-2xl font-bold text-textPrimary mb-1">Clinical Intelligence</h1>
                        <p className="text-sm text-textSecondary">Pattern detection and outbreak surveillance algorithms</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8">

                {/* SECTION 1: OUTBREAK DETECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-textPrimary" size={18} />
                        <h2 className="text-lg font-bold text-textPrimary">Live Outbreak Clusters (48h Surveillance)</h2>
                    </div>

                    {outbreakClusters.length === 0 ? (
                        <div className="bg-routineLight border border-routine rounded-xl p-4 flex items-center gap-3">
                            <ShieldCheck className="text-routine" size={24} />
                            <div>
                                <h3 className="text-routine font-bold text-sm uppercase tracking-wider">All Clear</h3>
                                <p className="text-textPrimary text-sm">No anomalous clustering of severe cases detected across the district in the past 48 hours.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {outbreakClusters.map((cluster, i) => {
                                const isHigh = cluster.level === 'high'
                                const borderClass = isHigh ? 'border-critical' : 'border-urgent'
                                const bgClass = isHigh ? 'bg-criticalLight/20' : 'bg-urgentLight/20'
                                const textClass = isHigh ? 'text-critical' : 'text-urgent'

                                return (
                                    <div key={i} className={`rounded-xl border ${borderClass} ${bgClass} p-5 relative overflow-hidden group`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className={textClass} size={20} />
                                                <h3 className="font-bold text-textPrimary text-lg">{cluster.village}</h3>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-[#14161E] ${textClass} border ${borderClass}`}>
                                                {cluster.count} Cases
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-5">
                                            <div className="text-sm">
                                                <span className="text-textSecondary text-xs uppercase mr-2">Symptoms</span>
                                                <span className="text-textPrimary capitalize">{cluster.complaints}</span>
                                            </div>
                                            <div className="text-sm flex justify-between">
                                                <span className="text-textSecondary text-xs uppercase">Time Span</span>
                                                <span className="text-textPrimary text-xs">{formatTime(cluster.firstCaseDt)} - {formatTime(cluster.lastCaseDt)}</span>
                                            </div>
                                        </div>

                                        <Link to="/map" className="inline-flex w-full items-center justify-center gap-2 bg-[#14161E] hover:bg-surface border border-border py-2 rounded-lg text-sm text-textPrimary transition-colors">
                                            <Map size={14} /> View on Map <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* SECTION 2: CHARTS */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Symptoms Bar Chart */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                        <h2 className="text-textPrimary font-semibold mb-6 flex items-center gap-2">
                            <Activity size={16} className="text-primary" /> Most Common Presentations
                        </h2>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={symptomData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2A2D3E" />
                                    <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#F1F5F9', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#2A2D3E', opacity: 0.4 }} content={<CustomTooltip />} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {symptomData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Triage Distribution Donut */}
                    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center">
                        <h2 className="text-textPrimary font-semibold mb-2 w-full flex items-center gap-2">
                            <ShieldCheck size={16} className="text-primary" /> Triage Distribution
                        </h2>
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={triageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {triageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-textPrimary">{cases.length}</span>
                                <span className="text-xs text-textSecondary">Total</span>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-2">
                            {triageData.map(t => (
                                <div key={t.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }} />
                                    <span className="text-xs text-textSecondary uppercase tracking-wider">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: LANG & GEO */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Demographics: Language */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                        <h2 className="text-textPrimary font-semibold mb-5 flex items-center gap-2">
                            <Globe size={16} className="text-primary" /> Linguistic Breakdown
                        </h2>
                        <div className="space-y-4">
                            {languageData.map((l, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0F1117] p-3 rounded-lg border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                                            {l.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-textPrimary font-semibold text-sm">{l.name}</h4>
                                            <p className="text-xs text-textSecondary">Voice inputs parsed</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-textPrimary">{l.pct}%</div>
                                        <div className="text-xs text-textSecondary">{l.count} cases</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Demographics: Geo */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                        <h2 className="text-textPrimary font-semibold mb-5 flex items-center gap-2">
                            <MapPin size={16} className="text-primary" /> Geographic Volume
                        </h2>
                        <div className="space-y-4">
                            {topVillages.map((v, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-textPrimary font-medium">{v.village}</span>
                                        <span className="text-textSecondary">{v.count} cases</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#0F1117] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-1000"
                                            style={{ width: `${v.pct}%`, opacity: 1 - i * 0.15 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 5: 7 DAY TREND */}
                <section className="bg-surface border border-border rounded-xl p-5">
                    <h2 className="text-textPrimary font-semibold mb-6 flex items-center gap-2">
                        <Activity size={16} className="text-primary" /> 7-Day District Trend
                    </h2>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sevenDayTrend} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D3E" />
                                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                                <Area type="monotone" dataKey="ROUTINE" stackId="1" stroke={COLORS.ROUTINE} fill={COLORS.ROUTINE} fillOpacity={0.6} />
                                <Area type="monotone" dataKey="URGENT" stackId="1" stroke={COLORS.URGENT} fill={COLORS.URGENT} fillOpacity={0.6} />
                                <Area type="monotone" dataKey="CRITICAL" stackId="1" stroke={COLORS.CRITICAL} fill={COLORS.CRITICAL} fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* SECTION 4: HIGH RISK PATIENTS */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-textPrimary" size={18} />
                            <h2 className="text-lg font-bold text-textPrimary">High-Risk Patients Log</h2>
                        </div>
                        <span className="text-xs font-semibold bg-critical text-white px-2 py-1 rounded-full">{highRiskCases.length} Critical</span>
                    </div>

                    <div className="bg-surface border border-border rounded-xl overflow-x-auto shadow-2xl">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0F1117] text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="text-left font-semibold px-4 py-3">Patient</th>
                                    <th className="text-left font-semibold px-4 py-3">Complaint & Risk</th>
                                    <th className="text-left font-semibold px-4 py-3">AI Reasoning</th>
                                    <th className="text-left font-semibold px-4 py-3">Worker Info</th>
                                    <th className="text-left font-semibold px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {highRiskCases.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-textSecondary">No critical cases currently logged.</td>
                                    </tr>
                                ) : (
                                    highRiskCases.map(c => {
                                        const isReferred = referredCases[c.id]
                                        return (
                                            <tr
                                                key={c.id}
                                                className={`transition-colors ${isReferred ? 'bg-surface opacity-60' : 'bg-criticalLight/10 hover:bg-criticalLight/20'}`}
                                            >
                                                <td className="px-4 py-4 align-top">
                                                    <div className="font-bold text-textPrimary whitespace-nowrap">{c.patient_name || 'Unknown'}</div>
                                                    <div className="flex items-center gap-1 text-xs text-textSecondary mt-1">
                                                        {c.patient_age}y • {c.patient_gender}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-textSecondary mt-1 uppercase">
                                                        <MapPin size={10} /> {c.village || 'Unknown'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <div className="text-textPrimary font-medium">{c.chief_complaint || '—'}</div>
                                                    {c.red_flags && c.red_flags !== 'none' && (
                                                        <div className="inline-flex mt-2 items-start gap-1 text-critical text-[11px] font-semibold bg-critical/10 px-2 py-1 rounded border border-critical/20">
                                                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                                            <span>{c.red_flags}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <p className="text-xs text-textSecondary line-clamp-3 max-w-xs">{c.reasoning || 'No analysis available'}</p>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <div className="text-textPrimary text-xs font-semibold">{WORKER_NAMES[c.worker_id || ''] || c.worker_id}</div>
                                                    <div className="text-textSecondary text-[10px] mt-1">{formatTime(c.created_at)}</div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-center border-l border-border/30">
                                                    <button
                                                        onClick={() => setReferredCases(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-full flex items-center justify-center gap-1 ${isReferred
                                                                ? 'bg-[#0F1117] text-routine border border-routine hover:bg-surface'
                                                                : 'bg-critical text-white hover:bg-critical/80 shadow-lg shadow-critical/20'
                                                            }`}
                                                    >
                                                        {isReferred ? <><CheckCircle2 size={14} /> Referred</> : 'Mark Referred'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    )
}
