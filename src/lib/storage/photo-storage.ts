import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { devDataUriFallback } from './photo-fallback'

function storage() {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL } = process.env
    const values = [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL]
    if (!values.some(Boolean)) return null
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL) {
        throw new Error('R2 photo storage is incompletely configured')
    }

    const url = new URL(R2_PUBLIC_BASE_URL)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS origin')
    }

    return {
        bucket: R2_BUCKET_NAME,
        base: url.origin,
        client: new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
        }),
    }
}

// Every upload gets a fresh UUID key and a replaced photo gets a new URL, so the bytes
// behind a URL never change. Browsers keep a photo for a year (max-age, immutable).
// Cloudflare's edge keeps it for at most a day (s-maxage), so a deleted photo stops
// being served within a day even if the purge below is not configured.
export const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, s-maxage=86400, immutable'

export async function uploadPhoto(file: File, folder: 'athletes' | 'avatars') {
    const config = storage()
    if (!config) return devDataUriFallback(file)
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const key = `${folder}/${randomUUID()}.${extension}`
    await config.client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        CacheControl: PHOTO_CACHE_CONTROL,
    }))
    return `${config.base}/${key}`
}

export async function removePhoto(url: string | null) {
    if (!url) return
    try {
        const config = storage()
        if (!config || !url.startsWith(config.base + '/')) return
        const key = url.slice(config.base.length + 1)
        if (!/^(athletes|avatars)\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return
        await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
        await purgeCdnCache(url)
    } catch {
        console.error('Could not remove replaced or deleted R2 photo')
    }
}

// Deleting from R2 does not clear Cloudflare's edge cache: the custom domain keeps
// serving the old copy until s-maxage runs out. When a zone ID and a token with
// "Zone → Cache Purge" permission are set, purge the URL right away. Optional.
async function purgeCdnCache(url: string) {
    const { CLOUDFLARE_ZONE_ID, CLOUDFLARE_CACHE_PURGE_TOKEN } = process.env
    if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_CACHE_PURGE_TOKEN) return
    try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(CLOUDFLARE_ZONE_ID)}/purge_cache`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${CLOUDFLARE_CACHE_PURGE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: [url] }),
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) console.error(`Cloudflare cache purge failed (${res.status})`)
    } catch {
        console.error('Cloudflare cache purge failed')
    }
}
