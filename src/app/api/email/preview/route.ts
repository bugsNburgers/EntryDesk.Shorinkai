// ============================================================================
// EntryDesk — Email Preview & Verification Endpoint
// GET /api/email/preview?type=(accepted|rejected|correction_needed|digest)&format=(html|json)&send=(true|false)&to=user@example.com
// Allows developers and admins to preview templates in-browser and test delivery.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, sendEmail, isEmailConfigured } from '@/lib/email'
import { renderAcceptedEmail } from '@/lib/email/templates/accepted'
import { renderRejectedEmail } from '@/lib/email/templates/rejected'
import { renderCorrectionNeededEmail } from '@/lib/email/templates/correction-needed'
import { renderCoachDigestEmail } from '@/lib/email/templates/coach-digest'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'accepted'
    const format = searchParams.get('format') || 'html'
    const shouldSend = searchParams.get('send') === 'true'
    const recipient = searchParams.get('to') || 'test@example.com'

    const baseUrl = getBaseUrl()

    // Sample mock data for template preview
    const sampleData = {
        studentName: 'Aarav Sharma',
        eventTitle: 'National Karate Championship 2026',
        dojoName: 'Tiger Martial Arts Academy',
        categoryName: 'Male 10-11 Years Kumite (-35kg)',
        participationType: 'both',
        startDate: '2026-11-15',
        endDate: '2026-11-16',
        location: 'Kanteerava Indoor Stadium, Bengaluru',
        chestNo: 142,
        entryId: '00000000-0000-0000-0000-000000000001',
        baseUrl,
    }

    let rendered: { subject: string; html: string; text: string }

    switch (type) {
        case 'rejected':
            rendered = renderRejectedEmail({
                studentName: sampleData.studentName,
                eventTitle: sampleData.eventTitle,
                status: 'rejected',
                reason: 'Weight category exceeded maximum threshold during pre-verification.',
                dojoName: sampleData.dojoName,
                entryId: sampleData.entryId,
                baseUrl,
            })
            break

        case 'coach_declined':
            rendered = renderRejectedEmail({
                studentName: sampleData.studentName,
                eventTitle: sampleData.eventTitle,
                status: 'coach_declined',
                reason: 'Athlete is scheduled for black belt grading on the same weekend.',
                dojoName: sampleData.dojoName,
                entryId: sampleData.entryId,
                baseUrl,
            })
            break

        case 'correction_needed':
            rendered = renderCorrectionNeededEmail({
                studentName: sampleData.studentName,
                eventTitle: sampleData.eventTitle,
                coachNotes:
                    'Please update Aarav’s declared weight (weighed 34.5 kg yesterday) and select Kata only as discussed in dojo.',
                coachName: 'Vikram Rao',
                dojoName: sampleData.dojoName,
                entryId: sampleData.entryId,
                baseUrl,
            })
            break

        case 'digest':
            rendered = renderCoachDigestEmail({
                coachName: 'Vikram Rao',
                dojoName: 'Tiger Martial Arts Academy',
                pendingCount: 6,
                sampleStudents: ['Aarav Sharma', 'Diya Patel', 'Rohan Gupta', 'Kavya Nair'],
                baseUrl,
            })
            break

        case 'accepted':
        default:
            rendered = renderAcceptedEmail(sampleData)
            break
    }

    // Optional test send to verify Resend delivery
    if (shouldSend) {
        const sendResult = await sendEmail({
            to: recipient,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        })
        return NextResponse.json({
            type,
            recipient,
            emailConfigured: isEmailConfigured(),
            sendResult,
            subject: rendered.subject,
        })
    }

    // Return raw JSON
    if (format === 'json') {
        return NextResponse.json({
            type,
            emailConfigured: isEmailConfigured(),
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        })
    }

    // Return rendered HTML directly for in-browser visual preview
    return new NextResponse(rendered.html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    })
}
