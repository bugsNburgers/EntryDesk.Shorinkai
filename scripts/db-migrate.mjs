import { execFileSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'

const migrationsDir = new URL('../src/lib/db/migrations/', import.meta.url)
const migrations = (await readdir(migrationsDir))
    .filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/.test(file))
    .sort()
const args = process.argv.slice(2)
const local = args[0] === '--local'
const [requested, ...extraArgs] = local ? args.slice(1) : args

if (extraArgs.length || (requested && !migrations.includes(requested))) {
    console.error('Usage: npm run db:migrate or npm run db:migrate:local. Optionally pass -- <migration-filename.sql>.')
    process.exit(1)
}

const connectionString = local
    ? 'postgresql://postgres:test@127.0.0.1:55432/entrydesk'
    : process.env.DATABASE_URL
if (!connectionString) {
    console.error('Set DATABASE_URL in .env or in your terminal first.')
    process.exit(1)
}

let current = 'database setup'
try {
    if (local) {
        const container = 'entrydesk-test-pg'
        execFileSync('docker', ['start', container], { stdio: 'inherit' })
        execFileSync('docker', ['exec', container, 'timeout', '15', 'sh', '-c',
            'until pg_isready -h 127.0.0.1 -q; do sleep 1; done'], { stdio: 'inherit' })
    }
    const url = new URL(connectionString)
    // Use Neon's direct endpoint for the session lock and concurrent index build.
    if (url.hostname.endsWith('.neon.tech')) {
        url.hostname = url.hostname.replace('-pooler.', '.')
    }
    const sql = postgres(url.href, { max: 1, max_lifetime: null, onnotice: () => {} })
    try {
        await sql`SET lock_timeout = '5s'`
        const [{ locked }] = await sql`SELECT pg_try_advisory_lock(hashtext('entrydesk.db:migrate')) AS locked`
        if (!locked) throw new Error('Another migration run is active.')

        for (const file of requested ? [requested] : migrations) {
            current = file
            if (file === '004_chest_no_unique.sql') {
                const source = await readFile(new URL(file, migrationsDir), 'utf8')
                const [functionSql, indexSql] = source.split(/^-- entrydesk: standalone\r?$/m)
                if (!indexSql?.trim()) throw new Error('Missing standalone index statement.')

                const [index] = await sql`
                    SELECT indisvalid FROM pg_index
                    WHERE indexrelid = to_regclass('idx_entries_event_chest')
                `
                if (index && !index.indisvalid) {
                    await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_entries_event_chest`
                }
                await sql.begin(async (transaction) => {
                    await transaction.unsafe(functionSql).simple()
                })
                await sql.unsafe(indexSql).simple()
            } else {
                const source = await readFile(new URL(file, migrationsDir), 'utf8')
                await sql.begin(async (transaction) => {
                    await transaction.unsafe(source).simple()
                })
            }
            console.log(`Applied ${file}.`)
        }
    } finally {
        await sql.end()
    }
} catch (error) {
    const detail = typeof error.code === 'string' ? ` (${error.code})` : ''
    console.error(`Could not apply ${current}${detail}.`)
    process.exitCode = 1
}
