import { execFileSync, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import postgres from 'postgres'

const require = createRequire(import.meta.url)
const [mode, ...args] = process.argv.slice(2)
const container = 'entrydesk-tournament-pg'
const database = 'postgresql://postgres:rehearsal@localhost:55439/entrydesk_e2e_1794240394056'

try {
    execFileSync('docker', ['start', container], { stdio: 'inherit' })
    execFileSync('docker', ['exec', container, 'timeout', '15', 'sh', '-c',
        'until pg_isready -h 127.0.0.1 -q; do sleep 1; done'], { stdio: 'inherit' })

    const sql = postgres(database, { max: 1, connect_timeout: 5 })
    try {
        await sql`SELECT 1 FROM students LIMIT 1`
    } finally {
        await sql.end()
    }
} catch {
    console.error('Could not open the seeded EntryDesk Docker database. Check Docker Desktop and the tournament container.')
    process.exit(1)
}

const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), mode, ...args], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: database, BLOB_READ_WRITE_TOKEN: '', RESEND_API_KEY: '' },
})
next.on('exit', (code) => { process.exitCode = code ?? 1 })
next.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
})
