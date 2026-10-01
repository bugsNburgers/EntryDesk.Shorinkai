-- ==============================================================================
-- EntryDesk Database Migration: Parent Portal Extension
-- File: src/lib/db/migrations/001_parent_portal.sql
-- Description: Idempotent migration for Parent Portal, Join links, DPDP audit log,
--              PostgreSQL rate limiting, and OTP codes.
-- Target: Neon PostgreSQL (Run once in Neon Console SQL Editor)
-- Safety: Additive only. Never drops tables or columns. Safe to run multiple times.
-- ==============================================================================

-- 1. Extend users role to include 'parent'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('coach', 'organizer', 'admin', 'parent'));

-- 2. Dojo join-link columns
ALTER TABLE dojos ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE dojos ADD COLUMN IF NOT EXISTS join_code TEXT;
ALTER TABLE dojos ADD COLUMN IF NOT EXISTS join_link_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE dojos ADD COLUMN IF NOT EXISTS welcome_note TEXT;
ALTER TABLE dojos ADD COLUMN IF NOT EXISTS city TEXT;

UPDATE dojos SET
    slug = COALESCE(slug, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substring(md5(id::text) from 1 for 4)),
    join_code = COALESCE(join_code, substring(md5(random()::text || id::text) from 1 for 6))
WHERE slug IS NULL OR join_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dojos_slug ON dojos(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dojos_join_code ON dojos(join_code);

-- 3. Students: parent ownership, photos, DPDP consent
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_or_city TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_given_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS removed_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);

-- 4. Entries: coach review workflow + QR verification
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_status_check;
ALTER TABLE entries ADD CONSTRAINT entries_status_check
    CHECK (status IN ('draft','pending_coach','submitted','approved','rejected',
                      'correction_needed','coach_declined','withdrawn'));

ALTER TABLE entries ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS coach_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS coach_reviewed_at TIMESTAMPTZ;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS coach_notes TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS org_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS org_reviewed_at TIMESTAMPTZ;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS qr_token TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS declared_weight_kg NUMERIC;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS category_snapshot JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_qr_token ON entries(qr_token) WHERE qr_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_submitted_by ON entries(submitted_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_student_event ON entries(student_id, event_id);

-- 5. Events: coach review toggle + tournament rules
ALTER TABLE events ADD COLUMN IF NOT EXISTS coach_checks_each_entry BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_cutoff_rule TEXT NOT NULL DEFAULT 'tournament_day';
ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_events_per_athlete INT;

-- 6. OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(lower(email));
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- 7. PostgreSQL rate limiting table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key TEXT PRIMARY KEY,
    count INT NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON auth_rate_limits(reset_at);

-- 8. Audit log table (DPDP compliance)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL,
    actor_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
