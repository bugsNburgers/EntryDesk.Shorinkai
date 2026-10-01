// ============================================================================
// EntryDesk — Audit Log Helper
// Writes structured audit events to the audit_log table.
// Use for all security-sensitive and DPDP-required events.
//
// Do NOT await audit calls inside critical paths — fire and forget with
// auditAsync() so a logging failure never breaks the user's request.
// ============================================================================

import sql from '@/lib/db'
import type { AuditActorType } from '@/types/database'

export interface AuditEvent {
    actorType: AuditActorType
    actorId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    details?: Record<string, unknown> | null
    ipAddress?: string | null
}

/**
 * Writes an audit event synchronously. Throws on DB error.
 * Use this when you need guaranteed delivery (e.g., consent recording).
 */
export async function audit(event: AuditEvent): Promise<void> {
    await sql`
        INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, details, ip_address)
        VALUES (
            ${event.actorType},
            ${event.actorId ?? null},
            ${event.action},
            ${event.entityType},
            ${event.entityId ?? null},
            ${event.details ? JSON.stringify(event.details) : null},
            ${event.ipAddress ?? null}
        )
    `
}

/**
 * Writes an audit event without awaiting. Failures are logged to console only.
 * Use for non-critical events where a logging failure should not block the request.
 */
export function auditAsync(event: AuditEvent): void {
    audit(event).catch((err) => {
        console.error('[AUDIT_ERROR] Failed to write audit log:', err, event)
    })
}

// ─── Well-known action constants ──────────────────────────────────────────────
// Use these constants in all audit() calls to keep the action strings consistent
// and searchable across the codebase.

export const AUDIT_ACTIONS = {
    // Auth
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_LOGIN_FAILED: 'user.login_failed',
    OTP_SENT: 'otp.sent',
    OTP_VERIFIED: 'otp.verified',
    OTP_FAILED: 'otp.failed',
    PARENT_REGISTERED: 'parent.registered',

    // Student (DPDP events — guaranteed delivery required)
    STUDENT_CREATED: 'student.created',
    STUDENT_UPDATED: 'student.updated',
    STUDENT_CONSENT_GIVEN: 'student.consent_given',
    STUDENT_REMOVED: 'student.removed',
    STUDENT_ERASURE_REQUESTED: 'student.erasure_requested',
    STUDENT_ERASED: 'student.erased',
    STUDENT_PHOTO_UPLOADED: 'student.photo_uploaded',
    STUDENT_PHOTO_DELETED: 'student.photo_deleted',

    // Entry flow
    ENTRY_CREATED: 'entry.created',
    ENTRY_SUBMITTED: 'entry.submitted',
    ENTRY_COACH_FORWARDED: 'entry.coach_forwarded',
    ENTRY_COACH_SENT_BACK: 'entry.coach_sent_back',
    ENTRY_COACH_DECLINED: 'entry.coach_declined',
    ENTRY_APPROVED: 'entry.approved',
    ENTRY_REJECTED: 'entry.rejected',
    ENTRY_WITHDRAWN: 'entry.withdrawn',
    ENTRY_QR_TOKEN_GENERATED: 'entry.qr_token_generated',
    ENTRY_QR_TOKEN_REVOKED: 'entry.qr_token_revoked',

    // Dojo
    DOJO_CREATED: 'dojo.created',
    DOJO_UPDATED: 'dojo.updated',
    DOJO_JOIN_LINK_REGENERATED: 'dojo.join_link_regenerated',
    DOJO_JOIN_LINK_DISABLED: 'dojo.join_link_disabled',

    // Admin
    USER_CREATED: 'user.created',
    USER_DEACTIVATED: 'user.deactivated',
    USER_ROLE_CHANGED: 'user.role_changed',

    // Email notifications (Phase 6)
    EMAIL_STATUS_NOTIFICATION_SENT: 'email.status_notification_sent',
    EMAIL_STATUS_NOTIFICATION_FAILED: 'email.status_notification_failed',
    EMAIL_COACH_DIGEST_SENT: 'email.coach_digest_sent',
} as const
