// ============================================================================
// EntryDesk — Email Client & Configuration (Resend Integration)
// src/lib/email/client.ts
// Handles Resend client initialization, sender configuration, base URL,
// and safe sending with simulated fallback for local development.
// ============================================================================

import { Resend } from 'resend'

let cachedResend: Resend | null = null

/**
 * Returns the Resend client instance if RESEND_API_KEY is configured,
 * or null if no key is set.
 */
export function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) return null

    if (!cachedResend) {
        cachedResend = new Resend(apiKey)
    }
    return cachedResend
}

/**
 * Returns true if the email service has an active API key configured.
 */
export function isEmailConfigured(): boolean {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    return Boolean(apiKey && apiKey.length > 0 && !apiKey.startsWith('re_YOUR_'))
}

/**
 * Returns the configured sender identity for all system and notification emails.
 * Defaults to 'EntryDesk <noreply@entrydesk.app>'.
 */
export function getEmailFrom(): string {
    return process.env.EMAIL_FROM?.trim() || 'EntryDesk <noreply@entrydesk.app>'
}

/**
 * Returns the canonical base URL of the application, guaranteed without a trailing slash.
 * Respects NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_APP_URL, and APP_BASE_URL.
 */
export function getBaseUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_BASE_URL ||
        (process.env.NODE_ENV === 'production' ? 'https://entrydesk.app' : 'http://localhost:3000')

    return raw.trim().replace(/\/+$/, '')
}

export interface SendEmailOptions {
    to: string | string[]
    subject: string
    html: string
    text?: string
}

export interface SendEmailResult {
    success: boolean
    id?: string
    simulated?: boolean
    error?: string
}

/**
 * Sends an email using Resend with graceful fallback.
 * If RESEND_API_KEY is missing or invalid in local dev, it logs a clean simulated
 * dispatch without throwing, allowing dev workflows to proceed unimpeded.
 */
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: SendEmailOptions): Promise<SendEmailResult> {
    const recipient = Array.isArray(to) ? to.join(', ') : to

    if (!isEmailConfigured()) {
        console.warn(
            `[EMAIL_SERVICE:SIMULATED] RESEND_API_KEY not configured. Simulated dispatch:`,
            { to: recipient, subject }
        )
        return {
            success: true,
            simulated: true,
            id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        }
    }

    try {
        const resend = getResendClient()
        if (!resend) {
            return {
                success: false,
                error: 'Resend client could not be initialized.',
            }
        }

        const from = getEmailFrom()
        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            html,
            ...(text ? { text } : {}),
        })

        if (error) {
            console.error('[EMAIL_SERVICE:ERROR] Resend API returned error:', error)
            return {
                success: false,
                error: error.message || 'Failed to dispatch email via Resend.',
            }
        }

        return {
            success: true,
            id: data?.id,
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[EMAIL_SERVICE:EXCEPTION] Unexpected email dispatch failure:', message)
        return {
            success: false,
            error: message,
        }
    }
}
