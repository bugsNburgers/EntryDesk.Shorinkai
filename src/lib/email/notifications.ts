// ============================================================================
// EntryDesk — Email Notifications Service
// src/lib/email/notifications.ts
// Handles entry status transition email triggers: Accepted, Rejected, Correction Needed.
// Includes duplicate prevention, email budget enforcement, and DPDP audit logging.
// ============================================================================

import sql from '@/lib/db'
import { audit, auditAsync, AUDIT_ACTIONS } from '@/lib/audit'
import { getBaseUrl, sendEmail, isEmailConfigured, type SendEmailResult } from './client'
import { NOTIFIABLE_STATUSES, type NotifiableStatus } from './constants'
import { renderAcceptedEmail } from './templates/accepted'
import { renderRejectedEmail } from './templates/rejected'
import { renderCorrectionNeededEmail } from './templates/correction-needed'
import { renderCoachDigestEmail } from './templates/coach-digest'

export { NOTIFIABLE_STATUSES, type NotifiableStatus }

export interface StatusNotificationOptions {
    /** Optional specific reason or note (e.g. coach rejection reason or correction notes) */
    reason?: string
    /** Set to true to bypass duplicate check (e.g. manual resend by admin/coach) */
    force?: boolean
}

export interface NotificationResult {
    success: boolean
    skipped?: boolean
    reason?: string
    error?: string
    email?: string
    simulated?: boolean
    resendId?: string
}

/**
 * Triggers an email notification to the parent when an entry transitions
 * to a key status (Accepted, Rejected, Correction Needed).
 *
 * Safe to call in any server action — will never throw an unhandled exception.
 */
export async function sendEntryStatusNotification(
    entryId: string,
    targetStatus: string,
    options?: StatusNotificationOptions
): Promise<NotificationResult> {
    try {
        // ── 0. Guard: automated emails disabled without credentials ──────────────
        if (!isEmailConfigured() || process.env.ENABLE_AUTOMATED_EMAILS !== 'true') {
            return {
                success: true,
                skipped: true,
                reason: 'Automated emails are disabled (no email credentials or ENABLE_AUTOMATED_EMAILS not set).',
            }
        }

        // ── 1. Budget enforcement: verify this is a key notifiable status ────────
        if (!NOTIFIABLE_STATUSES.includes(targetStatus as NotifiableStatus)) {
            return {
                success: true,
                skipped: true,
                reason: `Status "${targetStatus}" is an intermediate state and does not trigger email notifications.`,
            }
        }

        // ── 2. Fetch entry, student, tournament, and parent contact details ──────
        const rows = await sql<{
            entry_id: string
            status: string
            participation_type: string | null
            category_name: string | null
            coach_notes: string | null
            rejection_reason: string | null
            chest_no: number | null
            student_id: string
            student_name: string
            student_parent_id: string | null
            parent_email: string | null
            parent_name: string | null
            event_id: string
            event_title: string
            event_start_date: string | null
            event_end_date: string | null
            event_location: string | null
            dojo_name: string | null
            coach_name: string | null
        }[]>`
            SELECT
                e.id AS entry_id,
                e.status,
                e.participation_type,
                c.name AS category_name,
                e.coach_notes,
                e.rejection_reason,
                e.chest_no,
                s.id AS student_id,
                s.name AS student_name,
                s.parent_id AS student_parent_id,
                p.email AS parent_email,
                p.full_name AS parent_name,
                ev.id AS event_id,
                ev.title AS event_title,
                ev.start_date AS event_start_date,
                ev.end_date AS event_end_date,
                ev.location AS event_location,
                d.name AS dojo_name,
                u.full_name AS coach_name
            FROM entries e
            JOIN students s ON e.student_id = s.id
            JOIN events ev ON e.event_id = ev.id
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN dojos d ON s.dojo_id = d.id
            LEFT JOIN users u ON d.coach_id = u.id
            LEFT JOIN users p ON (
                (s.parent_id IS NOT NULL AND p.id = s.parent_id)
                OR (e.submitted_by IS NOT NULL AND p.id = e.submitted_by)
            )
            WHERE e.id = ${entryId}
            LIMIT 1
        `

        if (!rows.length) {
            return { success: false, error: 'Entry not found.' }
        }

        const entry = rows[0]
        const parentEmail = entry.parent_email?.trim().toLowerCase()

        if (!parentEmail || !parentEmail.includes('@')) {
            // Entry has no parent associated (e.g., entered directly by coach with no parent portal link)
            return {
                success: true,
                skipped: true,
                reason: 'No parent email associated with this athlete entry.',
            }
        }

        // ── 3. Duplicate Prevention: Check audit log ─────────────────────────────
        if (!options?.force) {
            // Check if an email was already successfully recorded for this entry and status
            const recentLogs = await sql<{ id: string }[]>`
                SELECT id
                FROM audit_log
                WHERE entity_type = 'entry'
                  AND entity_id = ${entryId}
                  AND action = ${AUDIT_ACTIONS.EMAIL_STATUS_NOTIFICATION_SENT}
                  AND details->>'status' = ${targetStatus}
                  AND created_at > NOW() - INTERVAL '1 hour'
                LIMIT 1
            `
            if (recentLogs.length > 0) {
                return {
                    success: true,
                    skipped: true,
                    reason: `Duplicate notification suppressed: ${targetStatus} email already sent within the past hour.`,
                }
            }
        }

        // ── 4. Render template according to targetStatus ─────────────────────────
        const baseUrl = getBaseUrl()
        let rendered: { subject: string; html: string; text: string }

        if (targetStatus === 'approved') {
            rendered = renderAcceptedEmail({
                studentName: entry.student_name,
                eventTitle: entry.event_title,
                dojoName: entry.dojo_name,
                categoryName: entry.category_name,
                participationType: entry.participation_type,
                startDate: entry.event_start_date,
                endDate: entry.event_end_date,
                location: entry.event_location,
                chestNo: entry.chest_no,
                entryId: entry.entry_id,
                baseUrl,
            })
        } else if (targetStatus === 'rejected' || targetStatus === 'coach_declined') {
            const reason =
                options?.reason ||
                entry.rejection_reason ||
                entry.coach_notes ||
                undefined

            rendered = renderRejectedEmail({
                studentName: entry.student_name,
                eventTitle: entry.event_title,
                status: targetStatus === 'coach_declined' ? 'coach_declined' : 'rejected',
                reason,
                dojoName: entry.dojo_name,
                entryId: entry.entry_id,
                baseUrl,
            })
        } else if (targetStatus === 'correction_needed') {
            const coachNotes =
                options?.reason ||
                entry.coach_notes ||
                undefined

            rendered = renderCorrectionNeededEmail({
                studentName: entry.student_name,
                eventTitle: entry.event_title,
                coachNotes,
                coachName: entry.coach_name,
                dojoName: entry.dojo_name,
                entryId: entry.entry_id,
                baseUrl,
            })
        } else {
            return {
                success: true,
                skipped: true,
                reason: `No template mapped for status "${targetStatus}".`,
            }
        }

        // ── 5. Dispatch email via Resend client ──────────────────────────────────
        const dispatchResult: SendEmailResult = await sendEmail({
            to: parentEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        })

        // ── 6. Record audit log ──────────────────────────────────────────────────
        if (dispatchResult.success) {
            await audit({
                actorType: 'system',
                action: AUDIT_ACTIONS.EMAIL_STATUS_NOTIFICATION_SENT,
                entityType: 'entry',
                entityId: entry.entry_id,
                details: {
                    to: parentEmail,
                    status: targetStatus,
                    student_name: entry.student_name,
                    event_title: entry.event_title,
                    subject: rendered.subject,
                    simulated: dispatchResult.simulated || false,
                    resend_id: dispatchResult.id ?? null,
                },
            })

            return {
                success: true,
                email: parentEmail,
                simulated: dispatchResult.simulated,
                resendId: dispatchResult.id,
            }
        } else {
            auditAsync({
                actorType: 'system',
                action: AUDIT_ACTIONS.EMAIL_STATUS_NOTIFICATION_FAILED,
                entityType: 'entry',
                entityId: entry.entry_id,
                details: {
                    to: parentEmail,
                    status: targetStatus,
                    error: dispatchResult.error,
                },
            })

            return {
                success: false,
                email: parentEmail,
                error: dispatchResult.error,
            }
        }
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('[NOTIFICATIONS:ERROR] Failed to send status notification:', errorMsg)
        return {
            success: false,
            error: errorMsg,
        }
    }
}

/**
 * Bulk dispatch helper for multiple entries (e.g. bulk approval by organiser).
 * Processes sequentially or in small parallel batches to avoid rate limits.
 */
export async function sendBulkEntryStatusNotifications(
    entryIds: string[],
    targetStatus: string,
    options?: StatusNotificationOptions
): Promise<{ total: number; sent: number; skipped: number; failed: number }> {
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const id of entryIds) {
        try {
            const res = await sendEntryStatusNotification(id, targetStatus, options)
            if (res.success) {
                if (res.skipped) {
                    skipped++
                } else {
                    sent++
                }
            } else {
                failed++
            }
        } catch {
            failed++
        }
    }

    return { total: entryIds.length, sent, skipped, failed }
}

/**
 * Coach pending review queue digest.
 * Sends a summary email to a coach if they have entries waiting in pending_coach.
 */
export async function sendCoachPendingDigest(
    coachId: string
): Promise<NotificationResult> {
    try {
        // Fetch coach details
        const coaches = await sql<{
            id: string
            email: string
            full_name: string | null
            dojo_name: string | null
        }[]>`
            SELECT
                u.id,
                u.email,
                u.full_name,
                d.name AS dojo_name
            FROM users u
            LEFT JOIN dojos d ON d.coach_id = u.id
            WHERE u.id = ${coachId} AND u.role = 'coach' AND u.is_active = TRUE
            LIMIT 1
        `

        if (!coaches.length) {
            return { success: false, error: 'Coach not found.' }
        }

        const coach = coaches[0]

        // Fetch count and sample of pending entries
        const pendingEntries = await sql<{ student_name: string }[]>`
            SELECT s.name AS student_name
            FROM entries e
            JOIN students s ON e.student_id = s.id
            JOIN dojos d ON s.dojo_id = d.id
            WHERE (e.coach_id = ${coachId} OR d.coach_id = ${coachId})
              AND e.status = 'pending_coach'
            ORDER BY e.created_at DESC
            LIMIT 5
        `

        const pendingCountRows = await sql<{ count: string }[]>`
            SELECT COUNT(*)::text AS count
            FROM entries e
            JOIN students s ON e.student_id = s.id
            JOIN dojos d ON s.dojo_id = d.id
            WHERE (e.coach_id = ${coachId} OR d.coach_id = ${coachId})
              AND e.status = 'pending_coach'
        `
        const count = parseInt(pendingCountRows[0]?.count || '0', 10)

        if (count === 0) {
            return {
                success: true,
                skipped: true,
                reason: 'No pending entries waiting for this coach.',
            }
        }

        // Duplicate check: max 1 digest per coach per 20 hours
        const recentDigest = await sql<{ id: string }[]>`
            SELECT id
            FROM audit_log
            WHERE actor_id = ${coachId}
              AND action = ${AUDIT_ACTIONS.EMAIL_COACH_DIGEST_SENT}
              AND created_at > NOW() - INTERVAL '20 hours'
            LIMIT 1
        `
        if (recentDigest.length > 0) {
            return {
                success: true,
                skipped: true,
                reason: 'Coach digest already sent in the last 20 hours.',
            }
        }

        const baseUrl = getBaseUrl()
        const rendered = renderCoachDigestEmail({
            coachName: coach.full_name || 'Sensei',
            dojoName: coach.dojo_name || 'Your Dojo',
            pendingCount: count,
            sampleStudents: pendingEntries.map((r) => r.student_name),
            baseUrl,
        })

        const dispatch = await sendEmail({
            to: coach.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        })

        if (dispatch.success) {
            await audit({
                actorType: 'system',
                actorId: coach.id,
                action: AUDIT_ACTIONS.EMAIL_COACH_DIGEST_SENT,
                entityType: 'user',
                entityId: coach.id,
                details: {
                    pending_count: count,
                    to: coach.email,
                    simulated: dispatch.simulated || false,
                },
            })

            return {
                success: true,
                email: coach.email,
                simulated: dispatch.simulated,
            }
        } else {
            return {
                success: false,
                error: dispatch.error,
            }
        }
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        return { success: false, error: errorMsg }
    }
}
