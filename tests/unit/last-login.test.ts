import { describe, expect, it } from 'vitest'
import { maskEmail, parseLastLogin, serializeLastLogin } from '@/lib/auth/last-login-core'

describe('maskEmail', () => {
    it('hides only the middle of the name and keeps the domain', () => {
        expect(maskEmail('pratikyagon@gmail.com')).toBe('pr***n@gmail.com')
        expect(maskEmail('pratik.y@gmail.com')).toBe('pr***y@gmail.com')
        expect(maskEmail('abcd@x.com')).toBe('ab***d@x.com')
    })
    it('short names keep one letter', () => {
        expect(maskEmail('ab@x.com')).toBe('a***@x.com')
        expect(maskEmail('  A@B.co ')).toBe('A***@B.co')
    })
    it('rejects non-emails', () => {
        expect(maskEmail('')).toBe('')
        expect(maskEmail('nope')).toBe('')
        expect(maskEmail('@gmail.com')).toBe('')
        expect(maskEmail('a@')).toBe('')
    })
    it('never leaks the middle of the local part', () => {
        expect(maskEmail('secretname@example.com')).not.toContain('cretnam')
    })
})

describe('serialize / parse round trip', () => {
    it('round-trips every method', () => {
        for (const method of ['google', 'email_code', 'password'] as const) {
            const raw = serializeLastLogin(method, 'parentuser@example.com')
            expect(parseLastLogin(raw)).toEqual({ method, maskedEmail: 'pa***r@example.com' })
        }
    })
    it('does not serialize bad input', () => {
        expect(serializeLastLogin('google', 'not-an-email')).toBeNull()
    })
})

describe('parseLastLogin (tampered or stale cookies)', () => {
    it('returns null instead of throwing', () => {
        for (const bad of [undefined, null, '', 'google', '|a***@x.com', 'facebook|a***@x.com', 'google|plain@x.com',
            'google|full.name@x.com', 'google|a***@x.com<script>', 'google|' + 'a'.repeat(500)]) {
            expect(parseLastLogin(bad as string | null | undefined)).toBeNull()
        }
    })
})
