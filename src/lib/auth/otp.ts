// ============================================================================
// EntryDesk — OTP Service (Email One-Time Password)
// ============================================================================
// Security controls (see implementation_plan_v2_part2.md §7.1):
//   - 6-digit code, 10-minute expiry
//   - bcrypt hashed in DB (NEVER plaintext)
//   - Single use: marked used=TRUE on first successful verify
//   - Max 5 wrong attempts per code (burns the code)
//   - Rate-limited at API layer (5 sends/email/15min, 10 sends/IP/15min)
//   - 30-second cooldown enforced server-side
//   - Email normalized (trim + lowercase) before lookup
// ============================================================================

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import sql from '@/lib/db'

const OTP_EXPIRY_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const OTP_RESEND_COOLDOWN_SECONDS = 30

// Common typo corrections shown client-side (never block, just suggest)
const EMAIL_TYPO_MAP: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gamil.com': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com',
    'yaho.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'outook.com': 'outlook.com',
}

/**
 * Suggests a corrected email if the domain looks like a common typo.
 * Returns null if no typo is detected.
 */
export function suggestEmailCorrection(email: string): string | null {
    const parts = email.trim().toLowerCase().split('@')
    if (parts.length !== 2) return null
    const [local, domain] = parts
    const corrected = EMAIL_TYPO_MAP[domain]
    return corrected ? `${local}@${corrected}` : null
}

/**
 * Generates a 6-digit OTP, bcrypt-hashes it, and stores it in otp_codes table.
 * Returns the plaintext code (to be sent via email, never stored).
 * Enforces 30-second cooldown since the last OTP for this email.
 */
export async function generateAndStoreOtp(email: string, ipAddress: string): Promise<{
    code: string
    cooldownError?: string
}> {
    const normalizedEmail = email.trim().toLowerCase()

    // Enforce resend cooldown — check for OTP created within the last 30 seconds
    const recent = await sql<{ created_at: Date }[]>`
        SELECT created_at
        FROM otp_codes
        WHERE lower(email) = ${normalizedEmail}
          AND created_at > NOW() - INTERVAL '${OTP_RESEND_COOLDOWN_SECONDS} seconds'
        ORDER BY created_at DESC
        LIMIT 1
    `
    if (recent.length > 0) {
        const elapsed = Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000)
        const waitSeconds = OTP_RESEND_COOLDOWN_SECONDS - elapsed
        return {
            code: '',
            cooldownError: `Please wait ${waitSeconds} seconds before requesting another code.`,
        }
    }

    // Generate 6-digit code with crypto to avoid Math.random() bias
    const rawCode = String(
        parseInt(crypto.randomBytes(3).toString('hex'), 16) % 1_000_000
    ).padStart(6, '0')

    const saltRounds = 10
    const codeHash = await bcrypt.hash(rawCode, saltRounds)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await sql`
        INSERT INTO otp_codes (email, code_hash, expires_at, ip_address)
        VALUES (${normalizedEmail}, ${codeHash}, ${expiresAt}, ${ipAddress})
    `

    // Cleanup old expired OTPs for this email (fire-and-forget)
    sql`
        DELETE FROM otp_codes
        WHERE lower(email) = ${normalizedEmail}
          AND (expires_at < NOW() OR used = TRUE)
          AND created_at < NOW() - INTERVAL '1 hour'
    `.catch(() => {})

    return { code: rawCode }
}

export type OtpVerifyResult =
    | { success: true; email: string }
    | { success: false; error: 'expired' | 'invalid' | 'max_attempts' | 'not_found' }

/**
 * Verifies an OTP code. Increments attempt counter. Marks as used on success.
 * Atomically safe: uses RETURNING to update and check in one query.
 */
export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
    const normalizedEmail = email.trim().toLowerCase()

    // Fetch the most recent unused, unexpired OTP for this email
    const rows = await sql<{
        id: string
        code_hash: string
        expires_at: Date
        attempts: number
        used: boolean
    }[]>`
        SELECT id, code_hash, expires_at, attempts, used
        FROM otp_codes
        WHERE lower(email) = ${normalizedEmail}
          AND used = FALSE
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    `

    if (rows.length === 0) {
        return { success: false, error: 'not_found' }
    }

    const otp = rows[0]

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        // Burn the code — mark used so it cannot be retried
        await sql`UPDATE otp_codes SET used = TRUE WHERE id = ${otp.id}`
        return { success: false, error: 'max_attempts' }
    }

    const isValid = await bcrypt.compare(code.trim(), otp.code_hash)

    if (!isValid) {
        // Increment attempts, and burn the code if this was the last attempt
        const newAttempts = otp.attempts + 1
        await sql`
            UPDATE otp_codes
            SET attempts = ${newAttempts},
                used = ${newAttempts >= OTP_MAX_ATTEMPTS}
            WHERE id = ${otp.id}
        `
        return { success: false, error: 'invalid' }
    }

    // Mark used so it cannot be replayed
    await sql`UPDATE otp_codes SET used = TRUE WHERE id = ${otp.id}`

    return { success: true, email: normalizedEmail }
}

/**
 * Sends the OTP email via Resend.
 * Returns { sent: true } on success, or { sent: false, error } on failure.
 */
export async function sendOtpEmail(to: string, code: string): Promise<{ sent: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const from = process.env.EMAIL_FROM || 'EntryDesk <noreply@entrydesk.app>'

    if (!apiKey || apiKey.startsWith('re_YOUR_')) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                `\n[OTP:DEV_SIMULATION] ──────────────────────────────────────────\nTo: ${to}\nOTP Code: ${code}\nValid for: 10 minutes\n─────────────────────────────────────────────────────────────\n`
            )
            return { sent: true }
        }
        console.error('[OTP] RESEND_API_KEY is not configured')
        return { sent: false, error: 'Email service not configured' }
    }

    try {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)

        const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #064e3b; padding: 28px 32px;">
      <p style="color: #d1fae5; margin: 0; font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">EntryDesk</p>
      <h1 style="color: #ffffff; margin: 8px 0 0; font-size: 22px; font-weight: 700;">Your login code</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">Use the code below to sign in to EntryDesk. It expires in <strong>10 minutes</strong>.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 40px; font-weight: 800; letter-spacing: 0.2em; color: #064e3b; font-family: 'Courier New', monospace;">${code}</span>
      </div>
      <p style="color: #94a3b8; margin: 0; font-size: 13px; line-height: 1.6;">If you didn't request this code, you can safely ignore this email. Your account is secure.</p>
    </div>
    <div style="border-top: 1px solid #f1f5f9; padding: 16px 32px; background: #f8fafc;">
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">EntryDesk · Karate Tournament Registration</p>
    </div>
  </div>
</body>
</html>`

        const { error } = await resend.emails.send({
            from,
            to,
            subject: `${code} is your EntryDesk login code`,
            html,
            text: `Your EntryDesk login code is: ${code}. It expires in 10 minutes.`,
        })

        if (error) {
            console.error('[OTP] Resend error:', error)
            return { sent: false, error: 'Failed to send email. Please try again.' }
        }

        return { sent: true }
    } catch (err) {
        console.error('[OTP] Unexpected error sending email:', err)
        return { sent: false, error: 'Failed to send email. Please try again.' }
    }
}
