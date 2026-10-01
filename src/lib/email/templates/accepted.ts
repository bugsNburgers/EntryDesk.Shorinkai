// ============================================================================
// EntryDesk — Email Template: Entry Accepted
// src/lib/email/templates/accepted.ts
// Triggered when an entry is approved by the tournament organiser.
// Plain English label: "Accepted" (never DB raw "approved")
// CTA: "Download Athlete ID Card"
// ============================================================================

import { getStatusLabel } from '../../status'
import { renderBaseEmailLayout, escapeHtml } from './base-layout'

export interface AcceptedEmailData {
    studentName: string
    eventTitle: string
    dojoName?: string | null
    categoryName?: string | null
    participationType?: string | null
    startDate?: string | null
    endDate?: string | null
    location?: string | null
    chestNo?: number | null
    entryId: string
    baseUrl: string
}

export function renderAcceptedEmail(data: AcceptedEmailData): {
    subject: string
    html: string
    text: string
} {
    const statusLabel = getStatusLabel('approved', 'parent') // "Accepted"
    const subject = `Accepted: Entry for ${data.studentName} — ${data.eventTitle}`
    const entryUrl = `${data.baseUrl}/parent/entries/${data.entryId}`

    // Format tournament dates
    let dateStr = ''
    if (data.startDate) {
        const start = new Date(data.startDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        if (data.endDate && data.endDate !== data.startDate) {
            const end = new Date(data.endDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
            dateStr = `${start} – ${end}`
        } else {
            dateStr = start
        }
    }

    const contentHtml = `
      <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
        Great news! The tournament registration for <strong>${escapeHtml(
            data.studentName
        )}</strong> has been accepted by the tournament organiser.
      </p>

      <!-- Details Summary Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 10px; width: 35%; font-size: 13px; color: #64748b;">Athlete</td>
                <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(
                    data.studentName
                )}</td>
              </tr>
              <tr>
                <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Tournament</td>
                <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(
                    data.eventTitle
                )}</td>
              </tr>
              ${
                  data.dojoName
                      ? `<tr>
                          <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Dojo / Club</td>
                          <td style="padding-bottom: 10px; font-size: 14px; color: #0f172a;">${escapeHtml(
                              data.dojoName
                          )}</td>
                        </tr>`
                      : ''
              }
              ${
                  data.categoryName
                      ? `<tr>
                          <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Category</td>
                          <td style="padding-bottom: 10px; font-size: 14px; color: #0f172a;">${escapeHtml(
                              data.categoryName
                          )}</td>
                        </tr>`
                      : ''
              }
              ${
                  data.participationType
                      ? `<tr>
                          <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Events</td>
                          <td style="padding-bottom: 10px; font-size: 14px; text-transform: capitalize; color: #0f172a;">${escapeHtml(
                              data.participationType
                          )}</td>
                        </tr>`
                      : ''
              }
              ${
                  data.chestNo
                      ? `<tr>
                          <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Chest Number</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #047857; font-family: monospace;">#${data.chestNo}</td>
                        </tr>`
                      : ''
              }
              ${
                  dateStr
                      ? `<tr>
                          <td style="padding-bottom: 10px; font-size: 13px; color: #64748b;">Date</td>
                          <td style="padding-bottom: 10px; font-size: 14px; color: #0f172a;">${escapeHtml(
                              dateStr
                          )}</td>
                        </tr>`
                      : ''
              }
              ${
                  data.location
                      ? `<tr>
                          <td style="font-size: 13px; color: #64748b;">Venue</td>
                          <td style="font-size: 14px; color: #0f172a;">${escapeHtml(
                              data.location
                          )}</td>
                        </tr>`
                      : ''
              }
            </table>
          </td>
        </tr>
      </table>

      <!-- Green Next Steps Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #065f46; margin-bottom: 4px;">
              ✓ What to do next: Download your ID card
            </div>
            <div style="font-size: 13px; color: #047857; line-height: 1.5;">
              The official ID card with a secure venue verification QR code is now ready. Please click the button below to download and save or print the card.
            </div>
          </td>
        </tr>
      </table>
    `

    const html = renderBaseEmailLayout({
        title: 'Entry Accepted!',
        subtitle: `${data.studentName} · ${data.eventTitle}`,
        badgeText: statusLabel,
        badgeType: 'success',
        contentHtml,
        ctaText: 'Download Athlete ID Card',
        ctaUrl: entryUrl,
        ctaColor: '#059669',
        previewText: `Accepted! Download the ID card for ${data.studentName} (${data.eventTitle}).`,
    })

    const text = `ENTRYDESK — TOURNAMENT ENTRY ACCEPTED

Great news! The tournament registration for ${data.studentName} has been accepted by the tournament organiser.

Tournament: ${data.eventTitle}
Athlete: ${data.studentName}
${data.dojoName ? `Dojo: ${data.dojoName}\n` : ''}${data.categoryName ? `Category: ${data.categoryName}\n` : ''}${data.participationType ? `Events: ${data.participationType}\n` : ''}${data.chestNo ? `Chest No: #${data.chestNo}\n` : ''}${dateStr ? `Date: ${dateStr}\n` : ''}${data.location ? `Venue: ${data.location}\n` : ''}
STATUS: ${statusLabel}

WHAT TO DO NEXT:
The official athlete ID card is ready. Please download your child's ID card and present it at check-in:
${entryUrl}

---
EntryDesk · Karate Tournament Registration
`

    return { subject, html, text }
}
