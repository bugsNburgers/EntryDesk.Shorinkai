// ============================================================================
// EntryDesk — Email Template: Coach Review Digest
// src/lib/email/templates/coach-digest.ts
// Optional coach digest for pending parent entries.
// Plain English label, clear action link.
// ============================================================================

import { renderBaseEmailLayout, escapeHtml } from './base-layout'

export interface CoachDigestEmailData {
    coachName: string
    dojoName: string
    pendingCount: number
    sampleStudents: string[]
    baseUrl: string
}

export function renderCoachDigestEmail(data: CoachDigestEmailData): {
    subject: string
    html: string
    text: string
} {
    const queueUrl = `${data.baseUrl}/dashboard/parent-entries`
    const countText = data.pendingCount === 1 ? '1 entry' : `${data.pendingCount} entries`
    const subject = `Review Queue: You have ${countText} waiting for your review — ${data.dojoName}`

    const studentsHtml =
        data.sampleStudents.length > 0
            ? `<ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.6;">
          ${data.sampleStudents
              .map((s) => `<li>${escapeHtml(s)}</li>`)
              .join('')}
          ${
              data.pendingCount > data.sampleStudents.length
                  ? `<li style="color: #64748b; font-style: italic;">...and ${
                        data.pendingCount - data.sampleStudents.length
                    } more</li>`
                  : ''
          }
        </ul>`
            : ''

    const contentHtml = `
      <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
        Namaste Coach <strong>${escapeHtml(
            data.coachName
        )}</strong>, you have <strong>${data.pendingCount} athlete & parent ${
        data.pendingCount === 1 ? 'entry' : 'entries'
    }</strong> waiting for your review for <strong>${escapeHtml(data.dojoName)}</strong>.
      </p>

      <!-- Queue Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-radius: 12px; border: 1px solid #fde68a; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 20px;">
            <div style="font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Waiting for Coach Review:
            </div>
            <div style="font-size: 24px; font-weight: 800; color: #b45309; font-family: monospace;">
              ${data.pendingCount}
            </div>
            ${studentsHtml}
          </td>
        </tr>
      </table>

      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
        Review your team's entries and forward them to the tournament organiser before the registration deadline.
      </p>
    `

    const html = renderBaseEmailLayout({
        title: 'Entries Waiting for Review',
        subtitle: `${data.dojoName} · Daily Review Digest`,
        badgeText: 'Review Queue',
        badgeType: 'warning',
        contentHtml,
        ctaText: 'Open Coach Review Queue',
        ctaUrl: queueUrl,
        ctaColor: '#059669',
        previewText: `You have ${countText} waiting for review in ${data.dojoName}`,
    })

    const text = `ENTRYDESK — COACH REVIEW QUEUE DIGEST

Namaste Coach ${data.coachName},

You have ${countText} waiting for your review for ${data.dojoName}.

Review and forward them to the tournament organiser here:
${queueUrl}

---
EntryDesk · Karate Tournament Registration
`

    return { subject, html, text }
}
