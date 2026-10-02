// ============================================================================
// EntryDesk — Zod Validation Schemas
// Apply in every server action BEFORE any database query.
// These schemas are the single source of truth for input constraints.
// ============================================================================

import { z } from 'zod'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const nonEmptyString = (max = 255) =>
    z.string().trim().min(1, 'This field is required').max(max, `Max ${max} characters`)

const optionalString = (max = 255) =>
    z.string().trim().max(max, `Max ${max} characters`).optional().or(z.literal(''))

// ─── Auth schemas ──────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

export const OtpRequestSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
})

export const OtpVerifySchema = z.object({
    email: z.string().trim().toLowerCase().email('Invalid email'),
    code: z
        .string()
        .trim()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

// ─── Dojo schemas ─────────────────────────────────────────────────────────────

export const CreateDojoSchema = z.object({
    name: nonEmptyString(100),
    city: optionalString(100),
    welcome_note: optionalString(500),
})

export const UpdateDojoSchema = CreateDojoSchema.partial().extend({
    join_link_enabled: z.boolean().optional(),
    welcome_note: optionalString(500),
})

// ─── Student schemas ──────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

/** Base student fields shared between coach and parent creation */
const StudentBaseSchema = z.object({
    name: nonEmptyString(100),
    gender: z.enum(['male', 'female'], { message: 'Select male or female' }),
    date_of_birth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .refine((dob) => {
            const year = parseInt(dob.split('-')[0], 10)
            return year >= 1940 && year <= CURRENT_YEAR
        }, 'Date of birth is out of range')
        .optional()
        .or(z.literal('')),
    weight: z
        .number({ error: 'Weight must be a number' })
        .positive('Weight must be positive')
        .max(200, 'Weight cannot exceed 200 kg')
        .optional(),
    rank: optionalString(50),
    school_or_city: optionalString(100),
    phone: optionalString(20),
})

/** Coach creating a student (no consent required — coach owns the dojo) */
export const CoachCreateStudentSchema = StudentBaseSchema.extend({
    dojo_id: z.string().uuid('Invalid dojo ID'),
})

/** Parent or athlete creating an athlete profile (DPDP consent required) */
export const ParentCreateStudentSchema = StudentBaseSchema.extend({
    dojo_id: z.string().uuid('Invalid dojo ID'),
    date_of_birth: z
        .string({ error: 'Date of birth is required' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
        .refine((dob) => {
            const year = parseInt(dob.split('-')[0], 10)
            return year >= 1940 && year <= CURRENT_YEAR
        }, 'Date of birth is out of range'),
    rank: nonEmptyString(50),
    weight: z
        .number({ error: 'Weight is required and must be a number' })
        .positive('Weight must be positive')
        .max(200, 'Weight cannot exceed 200 kg'),
    school_or_city: nonEmptyString(100),
    photo_url: z.string().min(1, 'Athlete photo is required. Please upload a clear face photo.'),
    consent: z.literal(true, {
        error: 'You must confirm you are the athlete or their lawful parent/guardian.',
    }),
    consent_version: z.string().default('v1.0'),
})

export const UpdateStudentSchema = StudentBaseSchema.partial().extend({
    // These fields cannot be changed by a parent once the entry is approved
    // (dob_locked check is enforced in the server action, not here)
    photo_url: z.string().url('Invalid photo URL').optional().or(z.literal('')),
})

// ─── Entry schemas ────────────────────────────────────────────────────────────

/** Used by both parent and coach when creating/updating an entry */
export const UpsertEntrySchema = z.object({
    student_id: z.string().uuid('Invalid student ID'),
    event_id: z.string().uuid('Invalid event ID'),
    category_id: z.string().uuid('Invalid category ID').optional().nullable(),
    event_day_id: z.string().uuid('Invalid event day ID').optional().nullable(),
    participation_type: z
        .string()
        .optional()
        .nullable(),
    declared_weight_kg: z
        .number()
        .positive()
        .max(200)
        .optional()
        .nullable(),
})

/** Coach reviewing a parent's entry */
export const CoachReviewEntrySchema = z.object({
    entry_id: z.string().uuid(),
    action: z.enum(['forward', 'send_back', 'decline']),
    notes: z.string().trim().max(500).optional(),
})

/** Organiser approving or rejecting a submitted entry */
export const OrganizerDecisionSchema = z.object({
    entry_id: z.string().uuid(),
    action: z.enum(['approve', 'reject', 'send_back']),
    reason: z.string().trim().max(500).optional(),
})

/** Withdrawal request (parent or coach) */
export const WithdrawEntrySchema = z.object({
    entry_id: z.string().uuid(),
    reason: z.string().trim().max(500).optional(),
})

// ─── Event schemas ────────────────────────────────────────────────────────────

export const CreateEventSchema = z.object({
    title: nonEmptyString(200),
    description: optionalString(2000),
    event_type: z.enum(['tournament', 'seminar', 'test']),
    level: nonEmptyString(50),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
    location: optionalString(200),
    is_public: z.boolean().default(false),
    is_registration_open: z.boolean().default(false),
    registration_close_date: z.string().optional().nullable(),
    coach_checks_each_entry: z.boolean().default(true),
    age_cutoff_rule: z.enum(['tournament_day', 'jan_1']).default('tournament_day'),
    photo_required: z.boolean().default(false),
    max_events_per_athlete: z.number().int().positive().optional().nullable(),
})

export const UpdateEventSchema = CreateEventSchema.partial()

// ─── Category schema ──────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
    event_id: z.string().uuid(),
    name: nonEmptyString(100),
    gender: z.enum(['male', 'female', 'mixed']).optional().nullable(),
    min_age: z.number().int().nonnegative().optional().nullable(),
    max_age: z.number().int().nonnegative().optional().nullable(),
    min_weight: z.number().positive().optional().nullable(),
    max_weight: z.number().positive().optional().nullable(),
    min_rank: optionalString(50),
    max_rank: optionalString(50),
})

// ─── Contact schema ───────────────────────────────────────────────────────────

export const ContactFormSchema = z.object({
    name: nonEmptyString(100),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    message: nonEmptyString(2000),
})
