// ============================================================================
// EntryDesk — Email Base Layout Template
// src/lib/email/templates/base-layout.ts
// Responsive, cross-client HTML email layout for EntryDesk notifications.
// Styled with high-contrast, modern typography and EntryDesk brand aesthetics.
// ============================================================================

export function escapeHtml(str: string | null | undefined): string {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export interface BaseLayoutOptions {
    title: string
    subtitle?: string
    badgeText?: string
    badgeType?: 'success' | 'warning' | 'danger' | 'info'
    contentHtml: string
    ctaText?: string
    ctaUrl?: string
    ctaColor?: string
    previewText?: string
}

export function renderBaseEmailLayout({
    title,
    subtitle = 'Tournament Registration Update',
    badgeText,
    badgeType = 'info',
    contentHtml,
    ctaText,
    ctaUrl,
    ctaColor,
    previewText = '',
}: BaseLayoutOptions): string {
    const escapedTitle = escapeHtml(title)
    const escapedSubtitle = escapeHtml(subtitle)
    const escapedBadge = badgeText ? escapeHtml(badgeText) : null
    const escapedCtaText = ctaText ? escapeHtml(ctaText) : null

    // Badge styling configurations
    const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
        success: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
        warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
        danger: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
        info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    }
    const badgeStyle = badgeColors[badgeType] || badgeColors.info

    // Button color fallback
    const buttonBg = ctaColor || '#059669'

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${escapedTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        margin: auto !important;
      }
      .content-padding {
        padding: 24px 20px !important;
      }
      .button-cell {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="background-color: #f8fafc; margin: 0; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${
      previewText
          ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #f8fafc;">${escapeHtml(
                previewText
            )}</div>`
          : ''
  }

  <!-- Main Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="email-container" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 36px;" class="content-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #a7f3d0; text-transform: uppercase; margin-bottom: 8px;">
                      ENTRYDESK
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3;">
                      ${escapedTitle}
                    </h1>
                    <div style="color: #d1fae5; font-size: 14px; margin-top: 6px;">
                      ${escapedSubtitle}
                    </div>
                  </td>
                  ${
                      escapedBadge
                          ? `<td align="right" valign="top" style="padding-left: 12px;">
                              <span style="display: inline-block; padding: 6px 14px; font-size: 12px; font-weight: 700; border-radius: 9999px; background-color: ${badgeStyle.bg}; color: ${badgeStyle.text}; border: 1px solid ${badgeStyle.border}; white-space: nowrap;">
                                ${escapedBadge}
                              </span>
                            </td>`
                          : ''
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px;" class="content-padding">
              ${contentHtml}

              <!-- Call To Action Button -->
              ${
                  escapedCtaText && ctaUrl
                      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; margin-bottom: 12px;">
                          <tr>
                            <td align="center">
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="border-radius: 12px; background-color: ${buttonBg};">
                                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: ${buttonBg}; letter-spacing: 0.02em;">
                                      ${escapedCtaText} &rarr;
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>`
                      : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; font-size: 12px; color: #64748b; line-height: 1.6;" class="content-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #334155; margin-bottom: 4px;">
                      EntryDesk · Karate Tournament Registration
                    </div>
                    <div>
                      This automated message was sent regarding your registration. If you have questions about your child's entry, please contact your dojo coach.
                    </div>
                    <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
                      Data processed strictly in accordance with DPDP compliance guidelines.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
