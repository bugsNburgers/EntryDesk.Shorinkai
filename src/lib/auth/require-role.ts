// ============================================================================
// EntryDesk — require-role.ts
//
// This file is a re-export barrel. All implementation lives in session.ts.
// We keep this file because 26+ source files import from '@/lib/auth/require-role'
// and we must not break them. This barrel ensures they all get the canonical
// implementation from session.ts without any duplication.
// ============================================================================

export type { UserRole } from '@/types/database'
export { getUserProfile, requireRole, getCurrentSession } from '@/lib/auth/session'
