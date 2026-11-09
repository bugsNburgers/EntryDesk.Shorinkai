-- ==============================================================================
-- Migration 004: chest numbers unique per event
-- Bug: assign_chest_no_on_approval() did MAX(chest_no)+1 with no lock and there was no
--      unique index, so two approvals committing at the same time could get the same number,
--      and a manual edit could duplicate a number silently.
-- Fix: serialise assignment per event with a transaction-scoped advisory lock, and enforce
--      uniqueness with a partial unique index on (event_id, chest_no).
--
-- Numbering policy (documented in .agents/modules/events.md):
--   * A number is assigned once, on the first transition to 'approved', as MAX(chest_no)+1
--     over ALL entries of the event (rejected/withdrawn entries keep their number, so it is
--     never handed to someone else automatically).
--   * Re-approving an entry keeps its existing number.
--   * Only an organiser editing numbers by hand can free or move a number.
--
-- HOW TO RUN ON NEON (production is live):
--   0. Check for duplicates first. This must return 0 rows, otherwise fix them by hand:
--        SELECT event_id, chest_no, count(*) FROM entries
--        WHERE chest_no IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1;
--   1. Run PART A (function) — safe inside a transaction.
--   2. Run PART B (the CREATE INDEX CONCURRENTLY statement) ON ITS OWN, not inside a
--      transaction/BEGIN block (CONCURRENTLY refuses to run in one). In the Neon SQL editor
--      run it as a single statement. It does not block reads/writes while it builds.
--   If PART B fails (e.g. duplicates), it can leave an INVALID index behind; remove it with
--        DROP INDEX CONCURRENTLY IF EXISTS idx_entries_event_chest;
--   fix the duplicates and run PART B again.
--
-- Rollback: DROP INDEX CONCURRENTLY IF EXISTS idx_entries_event_chest;
--           (the function change is harmless to keep; the old version is in git history)
-- ==============================================================================

-- PART A ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_chest_no_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    next_chest_no INTEGER;
BEGIN
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') AND NEW.chest_no IS NULL) THEN
        -- One assigner per event at a time; released at commit/rollback.
        PERFORM pg_advisory_xact_lock(hashtext('entrydesk.chest_no:' || NEW.event_id::text));

        SELECT COALESCE(MAX(chest_no), 0) + 1
        INTO next_chest_no
        FROM entries
        WHERE event_id = NEW.event_id;

        NEW.chest_no := next_chest_no;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PART B (run on its own, outside a transaction) -------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_event_chest
    ON entries (event_id, chest_no)
    WHERE chest_no IS NOT NULL;
