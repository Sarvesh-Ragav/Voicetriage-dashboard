interface StatCardProps {
    label: string
    value: number | string
    color: 'critical' | 'urgent' | 'routine' | 'neutral'
    sublabel?: string
}

const colorMap = {
    critical: { bg: 'bg-criticalLight', border: 'border-critical', text: 'text-critical', dot: 'bg-critical' },
    urgent: { bg: 'bg-urgentLight', border: 'border-urgent', text: 'text-urgent', dot: 'bg-urgent' },
    routine: { bg: 'bg-routineLight', border: 'border-routine', text: 'text-routine', dot: 'bg-routine' },
    neutral: { bg: 'bg-surface', border: 'border-border', text: 'text-textPrimary', dot: 'bg-textSecondary' },
}

export default function StatCard({ label, value, color, sublabel }: StatCardProps) {
    const c = colorMap[color]
    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-4 flex flex-col gap-1`}>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">{label}</span>
            </div>
            <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
            {sublabel && <span className="text-xs text-textSecondary">{sublabel}</span>}
        </div>
    )
}
