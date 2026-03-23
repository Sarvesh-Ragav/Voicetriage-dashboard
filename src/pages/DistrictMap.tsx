import { useState, useMemo, useEffect } from 'react'
import { MapPin, Clock, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Case } from '../types'
import { WORKER_NAMES } from '../lib/data'
import TriageBadge from '../components/shared/TriageBadge'

interface Props {
    cases: Case[]
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

// Child component to handle map flying
function MapFlyTo({ center, zoom }: { center: [number, number] | null; zoom: number }) {
    const map = useMap()
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { animate: true, duration: 1.5 })
        }
    }, [center, zoom, map])
    return null
}

type FilterType = 'ALL' | 'CRITICAL' | 'URGENT' | 'ROUTINE'

export default function DistrictMap({ cases }: Props) {
    const [filter, setFilter] = useState<FilterType>('ALL')
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
    const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null)

    // Pre-process missing coordinates exactly once
    const processedCases = useMemo(() => {
        return cases.map(c => {
            // Create random coordinates near India if missing
            if (!c.latitude || !c.longitude) {
                return {
                    ...c,
                    latitude: 20 + Math.random() * 10,
                    longitude: 78 + Math.random() * 10,
                }
            }
            return c
        })
    }, [cases])

    const filteredCases = useMemo(() => {
        const list = processedCases.filter(c => filter === 'ALL' || c.triage_level === filter)
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [processedCases, filter])

    const selectedCase = useMemo(() => {
        return processedCases.find(c => c.id === selectedCaseId) || null
    }, [processedCases, selectedCaseId])

    const handleCaseSelect = (c: Case) => {
        setSelectedCaseId(c.id)
        if (c.latitude && c.longitude) {
            setFlyToCenter([c.latitude, c.longitude])
        }
    }

    const counts = {
        ALL: processedCases.length,
        CRITICAL: processedCases.filter(c => c.triage_level === 'CRITICAL').length,
        URGENT: processedCases.filter(c => c.triage_level === 'URGENT').length,
        ROUTINE: processedCases.filter(c => c.triage_level === 'ROUTINE').length,
    }

    const getMarkerProps = (level: string | null) => {
        if (level === 'CRITICAL') return { color: 'white', fillColor: '#E24B4A', radius: 10, className: 'critical-pulse' }
        if (level === 'URGENT') return { color: 'white', fillColor: '#EF9F27', radius: 7 }
        return { color: 'white', fillColor: '#1D9E75', radius: 5 }
    }

    return (
        <div className="flex flex-col h-full bg-[#0F1117] overflow-hidden">
            <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .critical-pulse {
          transform-origin: center;
          animation: pulse-ring 2s infinite;
        }
        .leaflet-popup-content-wrapper {
          background-color: #1A1D27;
          color: #F1F5F9;
          border: 1px solid #2A2D3E;
          border-radius: 0.5rem;
        }
        .leaflet-popup-tip {
          background-color: #1A1D27;
          border: 1px solid #2A2D3E;
        }
      `}</style>

            {/* HEADER */}
            <div className="h-[60px] flex-shrink-0 border-b border-border bg-surface px-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-textPrimary">District Map</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-textSecondary text-sm">
                        Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-2 bg-routineLight border border-routine rounded-lg px-3 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-routine animate-pulse" />
                        <span className="text-routine text-xs font-semibold">{counts.ALL} Live Cases</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: MAP */}
                <div className="w-[60%] h-full flex flex-col border-r border-border relative">

                    {/* FILTER BAR OVERLAY */}
                    <div className="absolute top-4 left-4 right-4 z-[400] bg-surface/90 backdrop-blur-sm border border-border rounded-xl p-2 flex gap-2">
                        {(['ALL', 'CRITICAL', 'URGENT', 'ROUTINE'] as const).map(type => {
                            const isActive = filter === type
                            const colors = {
                                ALL: 'bg-primary text-white border-primary',
                                CRITICAL: 'bg-critical text-white border-critical',
                                URGENT: 'bg-urgent text-white border-urgent',
                                ROUTINE: 'bg-routine text-white border-routine'
                            }
                            const defaultColors = 'bg-transparent text-textSecondary border-transparent hover:bg-surfaceLight'

                            return (
                                <button
                                    key={type}
                                    onClick={() => setFilter(type)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isActive ? colors[type] : defaultColors}`}
                                >
                                    {type}
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-black/20 text-white' : 'bg-surface border border-border text-textSecondary'}`}>
                                        {counts[type]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <MapContainer
                        center={[20.5937, 78.9629]}
                        zoom={5}
                        style={{ width: '100%', height: 'calc(100vh - 120px)', backgroundColor: '#0F1117' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <MapFlyTo center={flyToCenter} zoom={selectedCaseId ? 10 : 5} />

                        {filteredCases.map(c => {
                            if (!c.latitude || !c.longitude) return null
                            const props = getMarkerProps(c.triage_level)
                            return (
                                <CircleMarker
                                    key={c.id}
                                    center={[c.latitude, c.longitude]}
                                    radius={props.radius}
                                    pathOptions={{
                                        color: props.color,
                                        weight: 1,
                                        fillColor: props.fillColor,
                                        fillOpacity: 0.8,
                                        className: props.className
                                    }}
                                    eventHandlers={{ click: () => handleCaseSelect(c) }}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[200px]">
                                            <div className="flex justify-between items-start mb-2">
                                                <strong className="text-textPrimary">{c.patient_name || 'Unknown'}</strong>
                                                <TriageBadge level={c.triage_level} size="sm" />
                                            </div>
                                            <p className="text-sm text-textSecondary mb-2">{c.chief_complaint}</p>
                                            <div className="text-xs text-textSecondary space-y-1">
                                                <div className="flex items-center gap-1"><MapPin size={10} /> {c.village || 'Unknown Location'}</div>
                                                <div className="flex items-center gap-1"><Info size={10} /> {c.patient_age} yrs, {c.patient_gender}</div>
                                                <div className="flex items-center gap-1"><Clock size={10} /> {formatTime(c.created_at)}</div>
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            )
                        })}
                    </MapContainer>
                </div>

                {/* RIGHT: CASE FEED & DETAIL */}
                <div className="w-[40%] flex flex-col bg-surface h-full overflow-hidden">
                    <div className="p-4 border-b border-border bg-surface flex-shrink-0 flex justify-between items-center">
                        <h2 className="font-semibold text-textPrimary">Case Feed</h2>
                        <span className="text-xs text-textSecondary">{filteredCases.length} records</span>
                    </div>

                    {/* SROLLABLE LIST */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredCases.length === 0 ? (
                            <div className="text-center py-10 text-textSecondary text-sm">No cases match the filter.</div>
                        ) : (
                            filteredCases.map(c => {
                                const isSelected = selectedCaseId === c.id
                                const borderColor = c.triage_level === 'CRITICAL' ? 'border-l-critical' : c.triage_level === 'URGENT' ? 'border-l-urgent' : 'border-l-routine'

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => handleCaseSelect(c)}
                                        className={`p-3 rounded-lg border-l-4 border-y border-r cursor-pointer transition-all ${borderColor} ${isSelected
                                            ? 'bg-surfaceLight border-y-primary/20 border-r-primary/20'
                                            : 'bg-surface border-y-border border-r-border hover:bg-surfaceLight'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-textPrimary text-sm truncate pr-2">{c.patient_name || 'Unknown'}</h3>
                                            <TriageBadge level={c.triage_level} size="sm" />
                                        </div>
                                        <p className="text-textSecondary text-xs mb-3 line-clamp-2">{c.chief_complaint || 'No complaint details'}</p>
                                        <div className="flex justify-between items-center text-[10px] text-textSecondary uppercase tracking-wide">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={10} />
                                                <span className="truncate max-w-[100px]">{c.village || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={10} />
                                                <span>{formatTime(c.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* SELECTED CASE DETAIL BOTTOM PANEL */}
                    {selectedCase && (
                        <div className="h-[280px] border-t border-border bg-[#14161E] shrink-0 p-5 flex flex-col overflow-y-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-textPrimary leading-tight mb-1">{selectedCase.patient_name || 'Unknown Patient'}</h3>
                                    <div className="text-xs text-textSecondary flex items-center gap-2">
                                        <span>{selectedCase.patient_age || '--'} yrs</span>
                                        <span>•</span>
                                        <span className="capitalize">{selectedCase.patient_gender || '--'}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><MapPin size={10} /> {selectedCase.village || 'Unknown'}</span>
                                    </div>
                                </div>
                                <TriageBadge level={selectedCase.triage_level} />
                            </div>

                            <div className="space-y-4 text-sm flex-1">
                                <div>
                                    <h4 className="text-xs text-textSecondary uppercase tracking-wider font-semibold mb-1">Chief Complaint</h4>
                                    <p className="text-textPrimary bg-surface p-2 rounded border border-border">{selectedCase.chief_complaint || '—'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs text-textSecondary uppercase tracking-wider font-semibold mb-1">AI Reasoning</h4>
                                        <p className="text-textPrimary text-xs line-clamp-3">{selectedCase.reasoning || '—'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs text-textSecondary uppercase tracking-wider font-semibold mb-1">Worker & Lang</h4>
                                        <p className="text-textPrimary text-xs">{selectedCase.worker_id ? WORKER_NAMES[selectedCase.worker_id] || selectedCase.worker_id : 'Unknown Worker'}</p>
                                        <p className="text-textSecondary text-[10px] mt-1">{selectedCase.language_code || 'ta-IN'}</p>
                                    </div>
                                </div>

                                {selectedCase.red_flags && selectedCase.red_flags !== 'none' && (
                                    <div className="bg-criticalLight/50 border border-critical rounded-lg p-2 flex items-start gap-2">
                                        <AlertTriangle size={14} className="text-critical shrink-0 mt-0.5" />
                                        <p className="text-critical text-xs">{selectedCase.red_flags}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-border flex justify-end">
                                <button
                                    onClick={() => setSelectedCaseId(null)}
                                    className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Mark as Reviewed
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
