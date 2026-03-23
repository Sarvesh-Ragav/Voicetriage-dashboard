import type { Case } from '../types'

const villages = [
    'Vadapalani', 'Tambaram', 'Perambur', 'Ambattur', 'Avadi',
    'Chromepet', 'Pallavaram', 'Porur', 'Velachery', 'Adyar',
    'Sholinganallur', 'Medavakkam', 'Nanganallur', 'Guindy', 'Saidapet',
    'Gorakhpur', 'Varanasi', 'Lucknow', 'Kanpur', 'Agra',
    'Patna', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Darbhanga'
]

const complaints = [
    'fever for 3 days', 'headache and body ache', 'cough and cold',
    'fever and neck stiffness', 'chest pain and sweating', 'pregnancy bleeding',
    'child not feeding', 'diarrhea and vomiting', 'snake bite',
    'severe abdominal pain', 'difficulty breathing', 'unconscious',
    'mild headache', 'common cold', 'leg pain and fatigue',
    'mild fever', 'acidity and bloating', 'back pain'
]

const levels: Case['triage_level'][] = ['CRITICAL', 'URGENT', 'ROUTINE', 'ROUTINE', 'ROUTINE', 'URGENT']

const names = [
    'Priya Sharma', 'Rajan Kumar', 'Anita Devi', 'Suresh Patel', 'Lakshmi Nair',
    'Mohammed Ali', 'Deepa Krishnan', 'Rajesh Singh', 'Sunita Yadav', 'Arjun Mehta',
    'Kavitha Raju', 'Venkat Reddy', 'Meena Kumari', 'Sanjay Gupta', 'Radha Pillai'
]

export function generateSeedCases(count: number = 50): Omit<Case, 'id'>[] {
    const now = new Date()
    return Array.from({ length: count }, (_, i) => {
        const hoursAgo = Math.floor(Math.random() * 48)
        const created = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
        const level = levels[Math.floor(Math.random() * levels.length)]
        const village = villages[Math.floor(Math.random() * villages.length)]
        const isNorth = ['Gorakhpur', 'Varanasi', 'Lucknow', 'Kanpur', 'Agra', 'Patna', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Darbhanga'].includes(village)
        return {
            patient_name: names[Math.floor(Math.random() * names.length)],
            patient_age: String(Math.floor(Math.random() * 60) + 5),
            patient_gender: Math.random() > 0.5 ? 'female' : 'male',
            village,
            chief_complaint: complaints[Math.floor(Math.random() * complaints.length)],
            triage_level: level,
            transcript: 'Patient presented with symptoms as noted.',
            reasoning: 'Assessment based on reported symptoms and clinical protocol.',
            red_flags: level === 'CRITICAL' ? 'immediate danger signs present' : 'none',
            language_code: isNorth ? 'hi-IN' : 'ta-IN',
            worker_id: `worker_00${(i % 8) + 1}`,
            latitude: isNorth
                ? 25.5 + Math.random() * 2
                : 12.9 + Math.random() * 0.5,
            longitude: isNorth
                ? 82.5 + Math.random() * 2
                : 80.1 + Math.random() * 0.3,
            created_at: created.toISOString(),
        }
    })
}

export const WORKER_NAMES: Record<string, string> = {
    worker_001: 'Lakshmi Devi',
    worker_002: 'Priya Nair',
    worker_003: 'Anitha Kumari',
    worker_004: 'Sunita Sharma',
    worker_005: 'Rekha Pillai',
    worker_006: 'Meena Reddy',
    worker_007: 'Kavitha Rajan',
    worker_008: 'Deepa Krishnan',
}
