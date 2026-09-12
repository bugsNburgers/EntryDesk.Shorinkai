-- ==============================================================================
-- EntryDesk Complete Database Schema (PostgreSQL)
-- Fully decoupled from Supabase. Designed for Neon / standard Postgres.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS & AUTH
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT, -- NULL if only using Google OAuth
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'coach' CHECK (role IN ('coach', 'organizer', 'admin')),
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Backward-compatibility view: if any legacy code refers to "profiles"
CREATE OR REPLACE VIEW profiles AS 
SELECT 
    id, 
    email, 
    role, 
    full_name, 
    avatar_url, 
    created_at 
FROM users;

-- 3. SESSIONS (HttpOnly Secure Session Store)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 4. DOJOS (Managed by Coaches)
CREATE TABLE IF NOT EXISTS dojos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dojos_coach ON dojos(coach_id);

-- 5. STUDENTS (Athletes belonging to Dojos)
CREATE SEQUENCE IF NOT EXISTS student_reg_seq;

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL, -- 'male', 'female'
    date_of_birth DATE,
    weight NUMERIC, -- in kg
    rank TEXT,      -- 'white', 'yellow', 'brown_3', etc.
    registration_no TEXT UNIQUE,
    generic_checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_dojo ON students(dojo_id);
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students(registration_no);

-- Automatic Student Registration ID Generator (e.g., SK26-0001)
CREATE OR REPLACE FUNCTION generate_student_registration_no()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_val INTEGER;
BEGIN
    IF NEW.registration_no IS NULL OR NEW.registration_no = '' THEN
        year_prefix := 'SK' || to_char(NOW(), 'YY');
        SELECT nextval('student_reg_seq') INTO next_val;
        NEW.registration_no := year_prefix || '-' || LPAD(next_val::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_student_registration_no ON students;
CREATE TRIGGER tr_generate_student_registration_no
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION generate_student_registration_no();

-- 6. EVENTS (Managed by Organizers)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('tournament', 'seminar', 'test')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_registration_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_reg_open ON events(is_registration_open);

-- Prevent duplicate events created by the same organizer
CREATE UNIQUE INDEX IF NOT EXISTS events_dedupe_unique_idx ON events (
    organizer_id,
    lower(title),
    event_type,
    start_date,
    end_date,
    lower(COALESCE(location, ''))
);

-- 7. EVENT DAYS (Multi-day events)
CREATE TABLE IF NOT EXISTS event_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_days_event ON event_days(event_id);

-- 8. CATEGORIES (Competition Divisions for Tournaments)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT, -- 'male', 'female', 'mixed'
    min_age INT,
    max_age INT,
    min_weight NUMERIC,
    max_weight NUMERIC,
    min_rank TEXT,
    max_rank TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_event ON categories(event_id);

-- 9. EVENT APPLICATIONS (Coach request to participate)
CREATE TABLE IF NOT EXISTS event_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_event_apps_event ON event_applications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_apps_coach ON event_applications(coach_id);

-- 10. ENTRIES (Core Participation Record)
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    event_day_id UUID REFERENCES event_days(id) ON DELETE SET NULL,
    participation_type TEXT, -- 'kata', 'kumite', 'both'
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    chest_no INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_event ON entries(event_id);
CREATE INDEX IF NOT EXISTS idx_entries_coach ON entries(coach_id);
CREATE INDEX IF NOT EXISTS idx_entries_student ON entries(student_id);
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(event_day_id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);

-- Sequential Chest Number Assignment on Approval
CREATE OR REPLACE FUNCTION assign_chest_no_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    next_chest_no INTEGER;
BEGIN
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') AND NEW.chest_no IS NULL) THEN
        SELECT COALESCE(MAX(chest_no), 0) + 1
        INTO next_chest_no
        FROM entries
        WHERE event_id = NEW.event_id;
        
        NEW.chest_no := next_chest_no;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_assign_chest_no_on_approval ON entries;
CREATE TRIGGER tr_assign_chest_no_on_approval
BEFORE UPDATE ON entries
FOR EACH ROW
EXECUTE FUNCTION assign_chest_no_on_approval();
