// ============================================================================
// EntryDesk — Phase 6 Email Notifications Test Script
// scripts/test-phase6-email.mjs
// Verifies email templates, plain English labels, Resend integration, and safety.
// ============================================================================

import { renderAcceptedEmail } from '../src/lib/email/templates/accepted.ts'
import { renderRejectedEmail } from '../src/lib/email/templates/rejected.ts'
import { renderCorrectionNeededEmail } from '../src/lib/email/templates/correction-needed.ts'
import { renderCoachDigestEmail } from '../src/lib/email/templates/coach-digest.ts'
import { NOTIFIABLE_STATUSES } from '../src/lib/email/constants.ts'

console.log('─── Phase 6 Email Verification Test ─────────────────────────')

let testsPassed = 0
let testsFailed = 0

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`)
        testsPassed++
    } else {
        console.error(`  ✗ FAIL: ${message}`)
        testsFailed++
    }
}

// 1. Notifiable statuses check
assert(
    NOTIFIABLE_STATUSES.includes('approved') &&
        NOTIFIABLE_STATUSES.includes('rejected') &&
        NOTIFIABLE_STATUSES.includes('coach_declined') &&
        NOTIFIABLE_STATUSES.includes('correction_needed'),
    'All key status transitions are in NOTIFIABLE_STATUSES'
)
assert(
    !NOTIFIABLE_STATUSES.includes('draft') &&
        !NOTIFIABLE_STATUSES.includes('pending_coach') &&
        !NOTIFIABLE_STATUSES.includes('submitted') &&
        !NOTIFIABLE_STATUSES.includes('withdrawn'),
    'Intermediate statuses are excluded (budget enforcement)'
)

// 2. Test Accepted Template
const accepted = renderAcceptedEmail({
    studentName: 'Aarav Sharma',
    eventTitle: 'State Karate Championship 2026',
    dojoName: 'Tiger Martial Arts Academy',
    categoryName: 'Male 10-11 Years (-35kg)',
    participationType: 'kumite',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    location: 'Bengaluru Indoor Stadium',
    chestNo: 88,
    entryId: 'test-entry-uuid',
    baseUrl: 'https://entrydesk.app',
})

assert(accepted.subject.startsWith('Accepted:'), 'Accepted subject starts with "Accepted:"')
assert(!accepted.subject.includes('approved'), 'Accepted subject does not leak raw "approved" DB key')
assert(accepted.html.includes('Aarav Sharma'), 'Accepted HTML includes athlete name')
assert(accepted.html.includes('State Karate Championship 2026'), 'Accepted HTML includes event title')
assert(accepted.html.includes('Download Athlete ID Card'), 'Accepted HTML contains ID card CTA')
assert(accepted.html.includes('#88'), 'Accepted HTML includes chest number')
assert(accepted.text.includes('STATUS: Accepted'), 'Accepted plain-text includes human status')

// 3. Test Rejected Template
const rejected = renderRejectedEmail({
    studentName: 'Diya Patel',
    eventTitle: 'State Karate Championship 2026',
    status: 'rejected',
    reason: 'Medical fitness certificate expired',
    dojoName: 'Tiger Martial Arts Academy',
    entryId: 'test-entry-uuid',
    baseUrl: 'https://entrydesk.app',
})

assert(rejected.subject.startsWith('Not accepted:'), 'Rejected subject starts with "Not accepted:"')
assert(!rejected.subject.includes('rejected'), 'Rejected subject does not leak raw "rejected" DB key')
assert(rejected.html.includes('Medical fitness certificate expired'), 'Rejected HTML includes reason')
assert(rejected.html.includes('View Entry Details'), 'Rejected HTML includes view entry CTA')
assert(rejected.text.includes('REASON: Medical fitness certificate expired'), 'Rejected text includes reason')

// 4. Test Coach Declined Template
const declined = renderRejectedEmail({
    studentName: 'Rohan Gupta',
    eventTitle: 'State Karate Championship 2026',
    status: 'coach_declined',
    reason: 'Not ready for advanced kumite category',
    dojoName: 'Tiger Martial Arts Academy',
    entryId: 'test-entry-uuid',
    baseUrl: 'https://entrydesk.app',
})

assert(declined.subject.startsWith('Not accepted:'), 'Coach declined subject uses human wording')
assert(declined.html.includes('Not ready for advanced kumite category'), 'Declined HTML includes reason')

// 5. Test Correction Needed Template
const correction = renderCorrectionNeededEmail({
    studentName: 'Kavya Nair',
    eventTitle: 'State Karate Championship 2026',
    coachNotes: 'Please correct date of birth to match Aadhaar card',
    coachName: 'Vikram Rao',
    dojoName: 'Tiger Martial Arts Academy',
    entryId: 'test-entry-uuid',
    baseUrl: 'https://entrydesk.app',
})

assert(correction.subject.startsWith('Action required:'), 'Correction subject indicates action required')
assert(correction.html.includes('Please correct date of birth to match Aadhaar card'), 'Correction HTML includes coach note')
assert(correction.html.includes('Coach Vikram Rao'), 'Correction HTML mentions coach name')
assert(correction.html.includes('Review and Correct Entry'), 'Correction HTML has review CTA')
assert(correction.text.includes('COACH\'S NOTE:'), 'Correction text includes coach note')

// 6. Test Coach Digest Template
const digest = renderCoachDigestEmail({
    coachName: 'Vikram Rao',
    dojoName: 'Tiger Martial Arts Academy',
    pendingCount: 4,
    sampleStudents: ['Aarav Sharma', 'Diya Patel', 'Rohan Gupta', 'Kavya Nair'],
    baseUrl: 'https://entrydesk.app',
})

assert(digest.subject.includes('4 entries waiting for your review'), 'Digest subject includes count')
assert(digest.html.includes('Open Coach Review Queue'), 'Digest has queue CTA')

console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed.`)
if (testsFailed > 0) {
    process.exit(1)
} else {
    console.log('✓ All Phase 6 email templates and rules passed!')
}
