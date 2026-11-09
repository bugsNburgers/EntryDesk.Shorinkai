-- ==============================================================================
-- Migration 005: repair JSONB values that were stored as JSON strings
-- Bug: the app passed JSON.stringify(x) as a parameter for JSONB columns. postgres.js
--      serialises jsonb parameters itself, so the value was encoded twice and stored as a
--      JSON *string* ('"{\"displayName\":...}"'). Reads such as
--      category_snapshot->>'displayName' returned NULL (category showed as "-"), and
--      audit_log.details could not be queried by key.
-- Fix (app): bind with sql.json(x). Fix (data): unwrap string values that hold an object/array.
-- Safe to run multiple times and while the app is running (only touches string-typed rows).
-- Rollback: not needed (values become the objects that were always intended).
-- ==============================================================================

UPDATE entries
SET category_snapshot = (category_snapshot #>> '{}')::jsonb
WHERE jsonb_typeof(category_snapshot) = 'string'
  AND left(category_snapshot #>> '{}', 1) IN ('{', '[');

UPDATE audit_log
SET details = (details #>> '{}')::jsonb
WHERE jsonb_typeof(details) = 'string'
  AND left(details #>> '{}', 1) IN ('{', '[');
