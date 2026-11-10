-- ==============================================================================
-- Migration 003: per-event athlete snapshot on entries
-- Owner decision (2026-11-09): parents may edit the athlete profile at any time, but an
-- entry keeps the details it was submitted with. Profile edits only affect future entries.
--
-- Adds nullable snap_* columns to entries, a trigger that fills them from the athlete
-- profile when an entry is created or re-activated (draft/withdrawn/declined/rejected →
-- pending_coach/submitted), and backfills existing rows from the current profile.
-- Reads that show an athlete in the context of an event use COALESCE(e.snap_*, s.*).
--
-- Safe to run multiple times and while the app is running. Additive only.
-- Rollback: DROP TRIGGER IF EXISTS tr_fill_entry_snapshot ON entries;
--           (columns can stay; the app falls back to the live profile when they are NULL)
-- ==============================================================================

ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_name TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_gender TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_dob DATE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_rank TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_school_or_city TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS snap_taken_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION fill_entry_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    st RECORD;
    refresh BOOLEAN := FALSE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        refresh := NEW.snap_taken_at IS NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Re-registration / coach draft being sent: take a fresh snapshot, unless the
        -- caller supplied one explicitly in this same statement.
        refresh := OLD.status IN ('draft', 'withdrawn', 'coach_declined', 'rejected')
               AND NEW.status IN ('pending_coach', 'submitted')
               AND NEW.snap_taken_at IS NOT DISTINCT FROM OLD.snap_taken_at;
    END IF;

    IF refresh THEN
        SELECT name, gender, date_of_birth, rank, weight, school_or_city
          INTO st FROM students WHERE id = NEW.student_id;
        IF FOUND THEN
            NEW.snap_name := st.name;
            NEW.snap_gender := st.gender;
            NEW.snap_dob := st.date_of_birth;
            NEW.snap_rank := st.rank;
            NEW.snap_school_or_city := st.school_or_city;
            IF TG_OP = 'INSERT' THEN
                NEW.declared_weight_kg := COALESCE(NEW.declared_weight_kg, st.weight);
            ELSIF NEW.declared_weight_kg IS NOT DISTINCT FROM OLD.declared_weight_kg THEN
                -- keep a weight the caller set in this statement, else take the profile's
                NEW.declared_weight_kg := COALESCE(st.weight, NEW.declared_weight_kg);
            END IF;
            NEW.snap_taken_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_entry_snapshot ON entries;
CREATE TRIGGER tr_fill_entry_snapshot
BEFORE INSERT OR UPDATE ON entries
FOR EACH ROW
EXECUTE FUNCTION fill_entry_snapshot();

-- Backfill existing entries from the current profile (best available data).
UPDATE entries e SET
    snap_name = s.name,
    snap_gender = s.gender,
    snap_dob = s.date_of_birth,
    snap_rank = s.rank,
    snap_school_or_city = s.school_or_city,
    declared_weight_kg = COALESCE(e.declared_weight_kg, s.weight),
    snap_taken_at = NOW()
FROM students s
WHERE s.id = e.student_id
  AND e.snap_taken_at IS NULL;
