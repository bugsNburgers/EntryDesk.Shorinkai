// Photos live on Vercel Blob (owner decision, 2026-11-09). Without BLOB_READ_WRITE_TOKEN,
// local development stores a base64 data: URI so the flow still works. In production
// that would bloat the DB with image bytes, so it fails closed instead.

export class PhotoStorageNotConfiguredError extends Error {
    constructor() {
        super('Photo storage is not configured (BLOB_READ_WRITE_TOKEN missing). Please contact support.')
        this.name = 'PhotoStorageNotConfiguredError'
    }
}

export async function devDataUriFallback(file: File): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
        throw new PhotoStorageNotConfiguredError()
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    return `data:${file.type};base64,${base64}`
}
