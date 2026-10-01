// ============================================================================
// EntryDesk — Email Template: Entry Rejected / Declined
// src/lib/email/templates/rejected.ts
// Triggered when an entry is rejected by the organiser or declined by the coach.
// Plain English label: "Not accepted" (never DB raw "rejected" or "coach_declined")
// CTA: "View Entry Details"
// ============================================================================

import { getStatusLabel } from '../../status'
import { renderBaseEmailLayout, escapeHtml } from './base-layout'

export interface RejectedEmailData {
    studentName: string
    eventTitle: string
    status: 'rejected' | 'coach_declined'
    reason?: string | null
    dojoName?: string | null
    entryId: string
    baseUrl: string
}

export function renderRejectedEmail(data: RejectedEmailData): {
    subject: string
    html: string
    text: string
} {
    const statusLabel = getStatusLabel(data.status, 'parent') // "Not accepted" or "Coach did not send it"
    const subject = `Not accepted: Entry for ${data.studentName} — ${data.eventTitle}`
    const entryUrl = `${data.baseUrl}/parent/entries/${data.entryId}`

    const defaultReason =
        data.status === 'coach_declined'
            ? 'Your coach has reviewed and decided not to submit this entry to the tournament organiser.'
            : 'The tournament organiser was unable to accept this entry.'

    const displayReason = data.reason?.trim() || defaultReason

    const contentHtml = `
      <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
        We are writing to inform you that the tournament entry for <strong>${escapeHtml(
            data.studentName
        )}</strong> for <strong>${escapeHtml(
        data.eventTitle
    )}</strong> could not be accepted.
      </p>

      <!-- Reason Callout Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 20px;">
            <div style="font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Reason Provided:
            </div>
            <div style="font-size: 14px; color: #7f1d1d; line-height: 1.6; font-style: italic;">
              "${escapeHtml(displayReason)}"
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

      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 16px;">
        If you have questions about this decision or need to make alternative arrangements, please reach out directly to your dojo coach.
      </p>
    `

    const html = renderBaseEmailLayout({
        title: 'Entry Not Accepted',
        subtitle: `${data.studentName} · ${data.eventTitle}`,
        badgeText: statusLabel,
        badgeType: 'danger',
        contentHtml,
        ctaText: 'View Entry Details',
        ctaUrl: entryUrl,
        ctaColor: '#dc2626',
        previewText: `Entry not accepted for ${data.studentName}: ${displayReason}`,
    })

    const text = `ENTRYDESK — TOURNAMENT ENTRY NOT ACCEPTED

The tournament registration for ${data.studentName} for ${data.eventTitle} could not be accepted.

STATUS: ${statusLabel}
REASON: ${displayReason}

Athlete: ${data.studentName}
Tournament: ${data.eventTitle}
${data.dojoName ? `Dojo: ${data.dojoName}\n` : ''}
To view full details or contact your coach, visit:
${entryUrl}

---
EntryDesk · Karate Tournament Registration
`

    return { subject, html, text }
}
