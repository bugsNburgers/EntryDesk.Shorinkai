// Photo uploads use R2. The data URI fallback is for local development only.
// local development stores a base64 data: URI so the flow still works. In production
// that would bloat the DB with image bytes, so it fails closed instead.

export class PhotoStorageNotConfiguredError extends Error {
    constructor() {
        super('Photo storage is not configured (R2 settings missing). Please contact support.')
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
