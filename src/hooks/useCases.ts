import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Case } from '../types'
import { generateSeedCases } from '../lib/data'

export function useCases() {
    const [cases, setCases] = useState<Case[]>([])
    const [loading, setLoading] = useState(true)

    const loadCases = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('casees')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200)

            if (error) {
                throw error
            }

            // Generate a few dummy cases to mix with real data
            const seed = generateSeedCases(8)
            const formattedSeed = seed.map((c, i) => ({ ...c, id: `seed-${i}` })) as Case[]

            if (!data || data.length === 0) {
                setCases(formattedSeed)
            } else {
                setCases([...(data as Case[]), ...formattedSeed])
            }
        } catch (err) {
            console.warn('Falling back to 60 seeds due to error fetch:', err)
            const seed = generateSeedCases(60)
            setCases(seed.map((c, i) => ({ ...c, id: `seed-${i}` })) as Case[])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadCases()
        const subscription = supabase
            .channel('cases-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casees' }, (payload) => {
                setCases(prev => [payload.new as Case, ...prev])
            })
            .subscribe()
        return () => { supabase.removeChannel(subscription) }
    }, [loadCases])

    const todayCases = cases.filter(c => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return new Date(c.created_at) >= today
    })

    const criticalCases = cases.filter(c => c.triage_level === 'CRITICAL')
    const urgentCases = cases.filter(c => c.triage_level === 'URGENT')
    const routineCases = cases.filter(c => c.triage_level === 'ROUTINE')

    return {
        cases,
        todayCases,
        criticalCases,
        urgentCases,
        routineCases,
        loading,
        refetch: loadCases,
    }
}
