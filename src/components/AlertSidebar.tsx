import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X, MapPin, AlertTriangle, Phone, CheckSquare, CheckCircle, Clock } from 'lucide-react'
import type { Case } from '../types'
import { WORKER_NAMES } from '../lib/data'

interface Props {
    criticalCases: Case[]
    onClose: () => void
}

function formatTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diff < 1) return 'now'
    if (diff < 60) return `${diff}m`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return `${Math.floor(diff / 1440)}d`
}

export default function AlertSidebar({ criticalCases, onClose }: Props) {
    const [handledIds, setHandledIds] = useState<Set<string>>(new Set())
    const [toast, setToast] = useState<string | null>(null)
    const [flash, setFlash] = useState(false)

    // Filter out cases that are marked as handled
    const visibleCases = useMemo(() => {
        return criticalCases
            .filter(c => !handledIds.has(c.id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [criticalCases, handledIds])

    // Header flash animation when new cases arrive
    useEffect(() => {
        if (criticalCases.length > 0) {
            setFlash(true)
            const t = setTimeout(() => setFlash(false), 1000)
            return () => clearTimeout(t)
        }
    }, [criticalCases.length])

    const showToast = (message: string) => {
        setToast(message)
        setTimeout(() => setToast(null), 2500)
    }

    const handleCallWorker = (wId: string | null) => {
        const wName = WORKER_NAMES[wId || ''] || wId || 'Unknown Worker'
        alert(`Calling ${wName}...\n[Feature: integrate with phone system]`)
    }

    const handleDispatch = (id: string) => {
        setHandledIds(prev => {
            const next = new Set(prev)
            next.add(id)
            return next
        })
        showToast('Case marked as dispatched')
    }

    const clearAll = () => {
        setHandledIds(new Set(criticalCases.map(c => c.id)))
        showToast('All alerts cleared')
    }

    return (
        <aside className="w-[280px] h-full bg-[#1A1D27] border-l border-[#2A2D3E] flex flex-col flex-shrink-0 z-50 relative shadow-2xl">

            {/* Dynamic Style Injection for Entrance Animation */}
            <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .alert-card-enter {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

            {/* Toast Notification */}
            {toast && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100] w-max max-w-[240px] pointer-events-none">
                    <div className="bg-routine/90 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-xl border border-[#2DE1A8]/30 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CheckCircle size={14} />
                        {toast}
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className={`p-4 border-b border-border transition-colors duration-500 flex justify-between items-center ${flash ? 'bg-critical' : 'bg-[#E24B4A]'}`}>
                <div className="flex items-center gap-2">
                    {visibleCases.length > 0 && (
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    )}
                    <Bell size={16} className="text-white" />
                    <h2 className="text-white font-bold text-sm tracking-wider uppercase">Alerts</h2>
                    <span className="bg-white text-critical text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                        {visibleCases.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 p-1 rounded-md transition-colors"
                    title="Close Sidebar"
                >
                    <X size={16} />
                </button>
            </div>

            {/* CONTENT: Scrollable List or Empty State */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0F1117] shadow-inner">
                {visibleCases.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-routineLight border-2 border-routine text-routine flex items-center justify-center shadow-[0_0_20px_rgba(29,158,117,0.2)]">
                            <CheckCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-routine font-bold text-lg mb-1">All Clear</h3>
                            <p className="text-textSecondary text-xs">No critical cases at this time</p>
                        </div>
                        <div className="text-[10px] text-textSecondary uppercase tracking-widest mt-4 flex items-center gap-1">
                            <Clock size={10} />
                            Last Checked: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ) : (
                    visibleCases.map((c, index) => (
                        <div
                            key={c.id}
                            className="bg-[#2D1515] border-l-[3px] border-l-critical rounded-r-lg p-3 shadow-lg alert-card-enter hover:bg-[#351A1A] transition-colors"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex justify-between items-start mb-1.5">
                                <span className="font-bold text-white text-sm line-clamp-1 pr-2">{c.patient_name || 'Unknown Patient'}</span>
                                <span className="text-critical font-bold text-[10px] uppercase tracking-wider whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded">
                                    {formatTime(c.created_at)}
                                </span>
                            </div>

                            <div className="text-textSecondary text-xs mb-2 leading-tight line-clamp-2">
                                {c.chief_complaint || 'No complaint specified'}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-textPrimary uppercase tracking-wider font-semibold mb-2 bg-[#1A0A0A] p-1 rounded border border-critical/30">
                                <MapPin size={10} className="text-critical shrink-0" />
                                <span className="truncate">{c.village || 'Unknown Location'}</span>
                            </div>

                            {c.red_flags && c.red_flags !== 'none' && (
                                <div className="flex items-start gap-1 text-[11px] text-critical mb-3 px-1.5 py-1 border border-critical/30 bg-critical/10 rounded font-medium">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    <span className="leading-tight">{c.red_flags}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-auto">
                                <button
                                    onClick={() => handleCallWorker(c.worker_id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 border border-critical text-critical hover:bg-critical hover:text-white px-2 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors"
                                >
                                    <Phone size={10} /> Call
                                </button>
                                <button
                                    onClick={() => handleDispatch(c.id)}
                                    className="flex-1 flex items-center justify-center gap-1 bg-critical hover:bg-critical/80 text-white px-2 py-1.5 rounded-md text-[10px] font-bold uppercase shadow-[0_2px_10px_rgba(226,75,74,0.3)] transition-colors"
                                >
                                    <CheckSquare size={12} /> Dispatch
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FOOTER */}
            <div className="p-3 border-t border-border bg-surface flex-shrink-0 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-textSecondary font-semibold uppercase tracking-wider text-[10px]">
                        {visibleCases.length} Critical Alerts
                    </span>
                    <button
                        onClick={clearAll}
                        disabled={visibleCases.length === 0}
                        className={`font-semibold hover:underline transition-colors ${visibleCases.length > 0 ? 'text-primary' : 'text-textSecondary/50 cursor-not-allowed'}`}
                    >
                        Clear All
                    </button>
                </div>
                <Link
                    to="/map"
                    className="w-full bg-[#0F1117] hover:bg-border border border-border text-center py-2 rounded-lg text-xs text-textPrimary font-semibold transition-colors flex justify-center items-center gap-2"
                >
                    <MapPin size={12} /> View all on map
                </Link>
            </div>

        </aside>
    )
}
