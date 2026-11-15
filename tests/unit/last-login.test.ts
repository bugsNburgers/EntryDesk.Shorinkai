import { describe, expect, it } from 'vitest'
import { maskEmail, parseLastLogin, serializeLastLogin } from '@/lib/auth/last-login-core'

describe('maskEmail', () => {
    it('keeps the first letter and the domain only', () => {
        expect(maskEmail('pratik.y@gmail.com')).toBe('p***@gmail.com')
        expect(maskEmail('  A@B.co ')).toBe('A***@B.co')
    })
    it('rejects non-emails', () => {
        expect(maskEmail('')).toBe('')
        expect(maskEmail('nope')).toBe('')
        expect(maskEmail('@gmail.com')).toBe('')
        expect(maskEmail('a@')).toBe('')
    })
    it('never leaks the rest of the local part', () => {
        expect(maskEmail('secretname@example.com')).not.toContain('ecret')
    })
})

describe('serialize / parse round trip', () => {
    it('round-trips every method', () => {
        for (const method of ['google', 'email_code', 'password'] as const) {
            const raw = serializeLastLogin(method, 'parent@example.com')
            expect(parseLastLogin(raw)).toEqual({ method, maskedEmail: 'p***@example.com' })
        }
    })
    it('does not serialize bad input', () => {
        expect(serializeLastLogin('google', 'not-an-email')).toBeNull()
    })
})

describe('parseLastLogin (tampered or stale cookies)', () => {
    it('returns null instead of throwing', () => {
        for (const bad of [undefined, null, '', 'google', '|a***@x.com', 'facebook|a***@x.com', 'google|plain@x.com',
            'google|a***@x.com<script>', 'google|' + 'a'.repeat(500)]) {
            expect(parseLastLogin(bad as string | null | undefined)).toBeNull()
        }
    })
})
