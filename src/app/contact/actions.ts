'use server'

import { sql } from '@/lib/db'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { getCurrentSession } from '@/lib/auth/session'
import { headers } from 'next/headers'

interface ContactFormData {
  name: string
  email: string
  message: string
  turnstileToken?: string
}

export async function submitContactForm(data: ContactFormData) {
  try {
    const headersList = await headers()
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Rate limit: maximum 5 messages per 10 minutes per IP
    const rateCheck = checkRateLimit(`contact:${clientIp}`, 5, 10 * 60 * 1000)

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds before submitting again.`,
      }
    }

    // Optional Turnstile token verification
    if (process.env.TURNSTILE_SECRET_KEY && data.turnstileToken) {
      try {
        const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: data.turnstileToken,
          }),
        })
        const turnstileResult = await turnstileResponse.json()
        if (!turnstileResult.success) {
          return {
            success: false,
            error: 'CAPTCHA verification failed. Please try again.',
          }
        }
      } catch (captchaErr) {
        console.warn('Turnstile verification error:', captchaErr)
      }
    }

    const trimmedName = data.name.trim()
    const trimmedEmail = data.email.trim().toLowerCase()
    const trimmedMessage = data.message.trim()

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return {
        success: false,
        error: 'Please fill in all required fields.',
      }
    }

    await sql`
      INSERT INTO contacts (name, email, message, status)
      VALUES (${trimmedName}, ${trimmedEmail}, ${trimmedMessage}, 'unread')
    `

    return {
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
    }
  } catch (error) {
    console.error('[CONTACT_ERROR] submitContactForm error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
    }
  }
}

export async function getContactSubmissions() {
  try {
    const session = await getCurrentSession()
    if (!session || session.user.role !== 'admin') {
      return { success: false, data: [] }
    }

    const data = await sql`
      SELECT * FROM contacts
      ORDER BY created_at DESC
    `

    return { success: true, data }
  } catch (error) {
    console.error('[CONTACT_ERROR] getContactSubmissions error:', error)
    return { success: false, data: [] }
  }
}
