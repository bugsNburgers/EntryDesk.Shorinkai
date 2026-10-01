// ============================================================================
// EntryDesk — QR Token helpers (server-side only)
// ============================================================================

import { randomBytes } from 'crypto'
import QRCode from 'qrcode'

/**
 * Generate a cryptographically secure, URL-safe QR token (32 hex chars).
 */
export function generateQrToken(): string {
    return randomBytes(16).toString('hex')
}

/**
 * Render a QR code as a base64 data URL suitable for embedding in <img> or PDF.
 * @param text  Full URL to encode (e.g. https://entrydesk.in/v/{token})
 */
export async function qrToDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
    })
}
