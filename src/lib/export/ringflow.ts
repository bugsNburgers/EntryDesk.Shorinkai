// ============================================================================
// EntryDesk → RingFlow "official roster" export (pure mapping, no DB).
//
// RingFlow (separate app) imports the FIRST sheet of an .xlsx via
// XLSX.utils.sheet_to_json and maps these exact headers (see RingFlow
// src/components/admin/AthletesClient.tsx → src/lib/roster/officialImport.ts
// prepareOfficialRows). RingFlow does its own categorisation from age/sex/weight;
// `category` is informational.
// ============================================================================

import { ageOn, ageReferenceDate } from '@/lib/category'

export const RINGFLOW_HEADERS = [
    'Number',
    'School',
    'School Code',
    'SPORTS ID',
    'Name',
    'category',
    'age',
    'sex',
    'belt',
    'day',
    'weight',
    'kata',
    'kumite',
    'Team Kata',
    'Team Kumite',
] as const

export type RingFlowRow = {
    Number: number
    School: string
    'School Code': string
    'SPORTS ID': string
    Name: string
    category: string
    age: number | ''
    sex: 'M' | 'F' | ''
    belt: string
    day: string
    weight: number | ''
    /** Blank when the entry has no participation type: RingFlow then infers (kumite if a weight is given). */
    kata: 'Yes' | 'No' | ''
    kumite: 'Yes' | 'No' | ''
    'Team Kata': 'Yes' | 'No'
    'Team Kumite': 'Yes' | 'No'
}

/** An approved entry, already resolved with COALESCE(snapshot, profile). */
export interface RingFlowSourceEntry {
    chest_no: number | null
    dojo_name: string | null
    dojo_join_code: string | null
    registration_no: string | null
    name: string
    gender: string | null
    dob: string | Date | null
    rank: string | null
    weight_kg: number | string | null
    day_name: string | null
    participation_type: string | null
    category_label: string | null
}

export interface RingFlowEventInfo {
    start_date: string | Date
    age_cutoff_rule: string | null
}

/** EntryDesk gender → RingFlow normalizeSex input ("M"/"F"). Anything else is left blank. */
export function mapSex(gender: string | null | undefined): 'M' | 'F' | '' {
    const g = (gender ?? '').trim().toLowerCase()
    if (g === 'male' || g === 'm') return 'M'
    if (g === 'female' || g === 'f') return 'F'
    return ''
}

/**
 * EntryDesk rank slug → belt name as RingFlow's default belt list writes it
 * (White, Yellow, Blue, Purple, Green, Brown, Black). Kyu/Dan grades collapse into
 * their colour. Unknown values are passed through title-cased so nothing is lost.
 */
export function mapBelt(rank: string | null | undefined): string {
    const r = (rank ?? '').trim().toLowerCase()
    if (!r) return ''
    if (r.startsWith('black') || ['shodan', 'nidan', 'sandan', 'yondan', 'godan'].includes(r)) return 'Black'
    if (r.startsWith('brown')) return 'Brown'
    const colours = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'red']
    for (const c of colours) {
        if (r === c || r.startsWith(c + '_') || r.startsWith(c + ' ')) return c[0].toUpperCase() + c.slice(1)
    }
    return r.replace(/[_\s]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

/** participation_type comma list → RingFlow event flags. `both` = kata + kumite. */
export function mapParticipation(participation: string | null | undefined) {
    const parts = (participation ?? '')
        .toLowerCase()
        .split(',')
        .map((p) => p.trim().replace(/\s+/g, '_'))
        .filter(Boolean)
    const has = (p: string) => parts.includes(p)
    return {
        kata: has('both') || has('kata'),
        kumite: has('both') || has('kumite'),
        teamKata: has('team_kata'),
        teamKumite: has('team_kumite'),
    }
}

const yn = (b: boolean): 'Yes' | 'No' => (b ? 'Yes' : 'No')

export function toRingFlowRows(entries: readonly RingFlowSourceEntry[], event: RingFlowEventInfo): RingFlowRow[] {
    const refDate = ageReferenceDate(event.start_date, event.age_cutoff_rule)
    return entries
        .filter((e): e is RingFlowSourceEntry & { chest_no: number } => e.chest_no != null)
        .slice()
        .sort((a, b) => a.chest_no - b.chest_no)
        .map((e) => {
            const age = e.dob && refDate ? ageOn(e.dob, refDate) : null
            const w = e.weight_kg == null || e.weight_kg === '' ? NaN : Number(e.weight_kg)
            const flags = mapParticipation(e.participation_type)
            const unknown = !(e.participation_type ?? '').trim()
            return {
                Number: e.chest_no,
                School: e.dojo_name ?? '',
                'School Code': e.dojo_join_code ?? '',
                'SPORTS ID': e.registration_no ?? '',
                Name: e.name.trim(),
                category: e.category_label ?? '',
                age: age !== null && age >= 0 && age < 120 ? age : '',
                sex: mapSex(e.gender),
                belt: mapBelt(e.rank),
                day: e.day_name ?? '',
                weight: Number.isFinite(w) && w > 0 && w < 1000 ? Math.round(w * 100) / 100 : '',
                kata: unknown ? '' : yn(flags.kata),
                kumite: unknown ? '' : yn(flags.kumite),
                'Team Kata': yn(flags.teamKata),
                'Team Kumite': yn(flags.teamKumite),
            }
        })
}
