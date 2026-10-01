// ============================================================================
// EntryDesk — rate-limit.ts (delegate to PostgreSQL implementation)
//
// The original in-memory Map implementation was broken on Vercel serverless:
// each container had its own ephemeral Map, so rate limits were never enforced
// across concurrent requests hitting different containers.
//
// This file now delegates to rate-limit-db.ts which uses a PostgreSQL table
// for atomic, cross-container rate limiting. The exported function signatures
// are identical so all existing callers (login/actions.ts etc.) work unchanged.
// ============================================================================

export { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit-db'
