// ============================================================================
// EntryDesk — Per-event athlete snapshot
// An entry keeps the athlete details it was submitted with (entries.snap_*,
// declared_weight_kg, category_snapshot). Profile edits only affect future entries.
// The DB trigger tr_fill_entry_snapshot (migration 003) fills snap_* on insert and on
// re-activation; this module computes the category label that goes with it.
// ============================================================================

import sql from '@/lib/db'
import type postgres from 'postgres'
import { ageReferenceDate, calculateCategory, type CalculatedCategory } from '@/lib/category'

export interface SnapshotProfile {
    name: string
    gender: string
    date_of_birth: string | Date | null
    rank: string | null
    weight: number | string | null
    school_or_city?: string | null
}

export interface SnapshotEvent {
    start_date: string | Date | null
    age_cutoff_rule: string | null
}

/**
 * Bind a value for a JSONB column. Do NOT pass JSON.stringify(x): postgres.js serialises
 * jsonb params itself, so a pre-stringified value is stored as a JSON *string* (migration 005).
 */
export function jsonb(value: unknown) {
    return sql.json(value as postgres.JSONValue)
}

function toIso(value: string | Date | null): string | null {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
    const m = String(value).match(/^\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : null
}

/** Category label for an athlete at a given event (age on the event's reference date). */
export function categoryForEvent(profile: SnapshotProfile, event: SnapshotEvent): CalculatedCategory {
    return calculateCategory(
        {
            date_of_birth: toIso(profile.date_of_birth),
            gender: profile.gender,
            rank: profile.rank,
            weight: profile.weight,
        },
        { referenceDate: ageReferenceDate(event.start_date, event.age_cutoff_rule) }
    )
}

/** Column values to write when (re)taking a snapshot explicitly in app code. */
export function snapshotColumns(profile: SnapshotProfile, event: SnapshotEvent, declaredWeight?: number | null) {
    const weight = declaredWeight ?? (profile.weight == null ? null : Number(profile.weight))
    const category = categoryForEvent({ ...profile, weight }, event)
    return {
        snap_name: profile.name,
        snap_gender: profile.gender,
        snap_dob: toIso(profile.date_of_birth),
        snap_rank: profile.rank,
        snap_school_or_city: profile.school_or_city ?? null,
        declared_weight_kg: weight,
        category_snapshot: category,
    }
}

/**
 * Recomputes category_snapshot for the given entries from their snapshot data
 * (falling back to the live profile for rows without a snapshot).
 * Used after a coach sends drafts and after a coach/organiser corrects a snapshot.
 */
export async function refreshCategorySnapshots(entryIds: string[]): Promise<void> {
    if (!entryIds.length) return
    const rows = await sql<{
        id: string
        name: string
        gender: string
        dob: string | null
        rank: string | null
        weight: string | null
        start_date: string | Date
        age_cutoff_rule: string | null
    }[]>`
        SELECT e.id,
               COALESCE(e.snap_name, s.name) AS name,
               COALESCE(e.snap_gender, s.gender) AS gender,
               COALESCE(e.snap_dob, s.date_of_birth)::text AS dob,
               COALESCE(e.snap_rank, s.rank) AS rank,
               COALESCE(e.declared_weight_kg, s.weight)::text AS weight,
               ev.start_date,
               ev.age_cutoff_rule
        FROM entries e
        JOIN students s ON s.id = e.student_id
        JOIN events ev ON ev.id = e.event_id
        WHERE e.id = ANY(${entryIds}::uuid[])
    `
    for (const r of rows) {
        const category = categoryForEvent(
            { name: r.name, gender: r.gender, date_of_birth: r.dob, rank: r.rank, weight: r.weight },
            r
        )
        await sql`UPDATE entries SET category_snapshot = ${jsonb(category)} WHERE id = ${r.id}`
    }
}
