// ============================================================================
// EntryDesk — Email Template: Correction Needed
// src/lib/email/templates/correction-needed.ts
// Triggered when a coach requests corrections from the parent.
// Plain English label: "Please correct and send again"
// CTA: "Review and Correct Entry"
// ============================================================================

import { getStatusLabel } from '../../status'
import { renderBaseEmailLayout, escapeHtml } from './base-layout'

export interface CorrectionNeededEmailData {
    studentName: string
    eventTitle: string
    coachNotes?: string | null
    coachName?: string | null
    dojoName?: string | null
    entryId: string
    baseUrl: string
}

export function renderCorrectionNeededEmail(data: CorrectionNeededEmailData): {
    subject: string
    html: string
    text: string
} {
    const statusLabel = getStatusLabel('correction_needed', 'parent') // "Please correct and send again"
    const subject = `Action required: Please update ${data.studentName}'s entry for ${data.eventTitle}`
    const entryUrl = `${data.baseUrl}/parent/entries/${data.entryId}`

    const displayNotes =
        data.coachNotes?.trim() ||
        'Please review the tournament registration details and resubmit for your coach to verify.'

    const senderCoach = data.coachName ? `Coach ${data.coachName}` : 'Your coach'

    const contentHtml = `
      <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
        ${escapeHtml(
            senderCoach
        )} has reviewed the tournament registration for <strong>${escapeHtml(
        data.studentName
    )}</strong> and requested an update before forwarding the entry to the organiser.
      </p>

      <!-- Coach Feedback Callout Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-radius: 12px; border: 1px solid #fde68a; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 20px;">
            <div style="font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Coach Feedback / Requested Changes:
            </div>
            <div style="font-size: 14px; color: #78350f; line-height: 1.6; font-style: italic;">
              "${escapeHtml(displayNotes)}"
            </div>
          </td>
        </tr>
      </table>

      <!-- Details Summary Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 8px; width: 35%; font-size: 13px; color: #64748b;">Athlete</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(
                    data.studentName
                )}</td>
              </tr>
              <tr>
                <td style="padding-bottom: 8px; font-size: 13px; color: #64748b;">Tournament</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(
                    data.eventTitle
                )}</td>
              </tr>
              ${
                  data.dojoName
                      ? `<tr>
                          <td style="font-size: 13px; color: #64748b;">Dojo / Club</td>
                          <td style="font-size: 14px; color: #0f172a;">${escapeHtml(
                              data.dojoName
                          )}</td>
                        </tr>`
                      : ''
              }
            </table>
          </td>
        </tr>
      </table>

      <!-- Action Instructions -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #166534; margin-bottom: 4px;">
              What to do:
            </div>
            <div style="font-size: 13px; color: #15803d; line-height: 1.5;">
              Click the button below to update the details. Once saved, your entry will be automatically sent back to your coach for review.
            </div>
          </td>
        </tr>
      </table>
    `

    const html = renderBaseEmailLayout({
        title: 'Correction Requested',
        subtitle: `${data.studentName} · ${data.eventTitle}`,
        badgeText: statusLabel,
        badgeType: 'warning',
        contentHtml,
        ctaText: 'Review and Correct Entry',
        ctaUrl: entryUrl,
        ctaColor: '#d97706',
        previewText: `Action needed for ${data.studentName}: ${displayNotes}`,
    })

    const text = `ENTRYDESK — ACTION REQUIRED: CORRECTION NEEDED

${senderCoach} has reviewed the tournament entry for ${data.studentName} and requested an update.

STATUS: ${statusLabel}
COACH'S NOTE: ${displayNotes}

Athlete: ${data.studentName}
Tournament: ${data.eventTitle}
${data.dojoName ? `Dojo: ${data.dojoName}\n` : ''}
WHAT TO DO:
Please review and update the registration at:
${entryUrl}

Once updated, your entry will be sent back to your coach for immediate verification.

---
EntryDesk · Karate Tournament Registration
`

    return { subject, html, text }
}
