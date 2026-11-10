-- ==============================================================================
-- Migration 002: fix registration number overflow at 10,000 athletes
-- Bug: LPAD(n::text, 4, '0') TRUNCATES when n has more than 4 digits, so athlete
--      #10000 got 'SK26-1000' (colliding with #1000), #10001 got 'SK26-1000', etc.
--      Every insert after 9,999 athletes fails with a unique-constraint error.
-- Fix: only pad numbers below 10000; larger numbers are used as-is.
-- Safe to run multiple times. Does not touch existing rows.
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_student_registration_no()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_val INTEGER;
BEGIN
    IF NEW.registration_no IS NULL OR NEW.registration_no = '' THEN
        year_prefix := 'SK' || to_char(NOW(), 'YY');
        SELECT nextval('student_reg_seq') INTO next_val;
        NEW.registration_no := year_prefix || '-' ||
            CASE WHEN next_val < 10000 THEN LPAD(next_val::TEXT, 4, '0') ELSE next_val::TEXT END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
