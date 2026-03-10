import { headers } from 'next/headers'

function firstForwardedIp(value: string | null) {
    if (!value) return null
    const first = value.split(',')[0]?.trim()
    return first || null
}

export function getIpFromHeaders(headerStore: Headers) {
    return (
        firstForwardedIp(headerStore.get('x-forwarded-for')) ??
        headerStore.get('x-real-ip') ??
        headerStore.get('cf-connecting-ip') ??
        'unknown'
    )
}

export async function getActionIp() {
    const headerStore = await headers()
    return getIpFromHeaders(headerStore)
}

export function normalizeEmail(email: string | null | undefined) {
    return (email ?? '').trim().toLowerCase()
}

export function key(parts: Array<string | null | undefined>) {
    return parts.filter(Boolean).join(':')
}
