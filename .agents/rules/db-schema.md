# DB Schema Reference

> Fast lookup for column names, types, constraints. Read this instead of schema.sql.

---

## users
```
id              UUID PK
email           TEXT UNIQUE (lowercase)
password_hash   TEXT NULL (null if Google-only)
full_name       TEXT NULL
role            TEXT CHECK('coach','organizer','admin') DEFAULT 'coach'
avatar_url      TEXT NULL
google_id       TEXT UNIQUE NULL
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```
View alias: `profiles` (id, email, role, full_name, avatar_url, created_at)

---

## sessions
```
id              UUID PK
user_id         UUID FK → users.id CASCADE
session_token   TEXT UNIQUE
expires_at      TIMESTAMPTZ
user_agent      TEXT NULL
ip_address      TEXT NULL
created_at      TIMESTAMPTZ
```

---

## dojos
```
id              UUID PK
coach_id        UUID FK → users.id CASCADE
name            TEXT
slug            TEXT UNIQUE (immutable once created)
join_code       TEXT UNIQUE (short, used in URL)
join_link_enabled BOOLEAN DEFAULT true
welcome_note    TEXT NULL
created_at      TIMESTAMPTZ
```

---

## students
```
id                  UUID PK
dojo_id             UUID FK → dojos.id CASCADE
guardian_account_id UUID NULL FK → guardian_accounts.id
name                TEXT
gender              TEXT ('male','female')
date_of_birth       DATE NULL
weight              NUMERIC NULL (kg)
rank                TEXT NULL ('white','yellow','brown_3', etc.)
registration_no     TEXT UNIQUE (auto: 'SK26-0001' via trigger)
photo_url           TEXT NULL
is_active           BOOLEAN DEFAULT true
dob_locked          BOOLEAN DEFAULT false
created_at          TIMESTAMPTZ
```

---

## guardian_accounts
```
id                  UUID PK
email               TEXT UNIQUE (lowercase)
full_name           TEXT NULL
phone               TEXT NULL
email_verified_at   TIMESTAMPTZ NULL
last_login_at       TIMESTAMPTZ NULL
status              TEXT CHECK('active','blocked') DEFAULT 'active'
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

---

## events
```
id                              UUID PK
organizer_id                    UUID FK → users.id CASCADE
title                           TEXT
description                     TEXT NULL
event_type                      TEXT CHECK('tournament','seminar','test')
level                           TEXT CHECK('club','district','state','national','international') DEFAULT 'district'
start_date                      DATE
end_date                        DATE
location                        TEXT NULL
is_public                       BOOLEAN DEFAULT false
is_registration_open            BOOLEAN DEFAULT true
registration_close_date         DATE NULL
temporary_registration_closes_at TIMESTAMPTZ NULL
created_at                      TIMESTAMPTZ
```
Unique index on: (organizer_id, lower(title), event_type, start_date, end_date, lower(location))

---

## event_days
```
id          UUID PK
event_id    UUID FK → events.id CASCADE
date        DATE
name        TEXT NULL
```

---

## categories
```
id          UUID PK
event_id    UUID FK → events.id CASCADE
name        TEXT
gender      TEXT NULL ('male','female','mixed')
min_age     INT NULL
max_age     INT NULL
min_weight  NUMERIC NULL
max_weight  NUMERIC NULL
min_rank    TEXT NULL
max_rank    TEXT NULL
```

---

## event_applications
```
id          UUID PK
event_id    UUID FK → events.id CASCADE
coach_id    UUID FK → users.id CASCADE
status      TEXT CHECK('pending','approved','rejected') DEFAULT 'pending'
created_at  TIMESTAMPTZ
UNIQUE(event_id, coach_id)
```

---

## entries
```
id                  UUID PK
event_id            UUID FK → events.id CASCADE
coach_id            UUID FK → users.id CASCADE
student_id          UUID FK → students.id CASCADE
category_id         UUID NULL FK → categories.id SET NULL
event_day_id        UUID NULL FK → event_days.id SET NULL
participation_type  TEXT NULL ('kata','kumite','both')
status              TEXT CHECK('draft','submitted','approved','rejected') DEFAULT 'draft'
chest_no            INTEGER NULL (auto-assigned on approval via trigger)
generic_checked     BOOLEAN DEFAULT false
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

---

## event_collaborators
```
id          UUID PK
event_id    UUID FK → events.id CASCADE
user_id     UUID FK → users.id CASCADE
permission  TEXT CHECK('read','write') DEFAULT 'read'
created_at  TIMESTAMPTZ
UNIQUE(event_id, user_id)
```

---

## dojo_collaborators
```
id          UUID PK
dojo_id     UUID FK → dojos.id CASCADE
user_id     UUID FK → users.id CASCADE
permission  TEXT CHECK('read','write') DEFAULT 'read'
created_at  TIMESTAMPTZ
UNIQUE(dojo_id, user_id)
```

---

## contacts
```
id          UUID PK
name        TEXT
email       TEXT
message     TEXT
status      TEXT CHECK('unread','read','archived') DEFAULT 'unread'
created_at  TIMESTAMPTZ
```

---

## DB Triggers

| Trigger | Table | Effect |
|---|---|---|
| `tr_generate_student_registration_no` | `students` BEFORE INSERT | Auto-sets `registration_no` = 'SK26-NNNN' |
| `tr_assign_chest_no_on_approval` | `entries` BEFORE UPDATE | Auto-sets `chest_no` when status → 'approved' |
| `evaluate_activity_on_entry` | `entries` AFTER INSERT/UPDATE/DELETE | Recalculates `students.is_active` per dojo |
