interface Props { level: string | null; size?: 'sm' | 'md' }

export default function TriageBadge({ level, size = 'md' }: Props) {
    const base = 'inline-flex items-center font-bold rounded-full uppercase tracking-wider'
    const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-xs px-3 py-1' }
    const colors = {
        CRITICAL: 'bg-critical text-white',
        URGENT: 'bg-urgent text-white',
        ROUTINE: 'bg-routine text-white',
    }
    const color = colors[level as keyof typeof colors] || colors.ROUTINE
    return <span className={`${base} ${sizes[size]} ${color}`}>{level || 'ROUTINE'}</span>
}
