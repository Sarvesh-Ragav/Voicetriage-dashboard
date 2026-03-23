export interface Case {
    id: string
    patient_name: string | null
    patient_age: string | null
    patient_gender: string | null
    village: string | null
    chief_complaint: string | null
    triage_level: 'CRITICAL' | 'URGENT' | 'ROUTINE' | null
    transcript: string | null
    reasoning: string | null
    red_flags: string | null
    language_code: string | null
    worker_id: string | null
    latitude: number | null
    longitude: number | null
    created_at: string
}

export interface Worker {
    id: string
    name: string
    village: string
    cases_today: number
    last_active: string
    status: 'active' | 'inactive'
}
