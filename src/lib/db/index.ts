import postgres from 'postgres'

// Prevent multiple connection pools during Next.js Fast Refresh in development
const globalForDb = globalThis as unknown as {
    sql?: postgres.Sql
}

const connectionString = process.env.DATABASE_URL || ''

// Check if we have a valid database URL (Neon or standard Postgres)
const isConfigured = Boolean(connectionString && !connectionString.includes('YOUR_NEON_DATABASE_URL'))

export const sql: postgres.Sql =
    globalForDb.sql ??
    postgres(isConfigured ? connectionString : 'postgresql://placeholder:placeholder@localhost:5432/placeholder', {
        max: 10, // Neon connection pool size
        idle_timeout: 20, // close idle connections after 20 seconds
        connect_timeout: 10, // 10s connection timeout
        ssl: isConfigured && connectionString.includes('sslmode=require') ? 'require' : isConfigured && !connectionString.includes('localhost') ? 'prefer' : false,
        transform: {
            undefined: null, // transform undefined values into null in queries
        },
    })

if (process.env.NODE_ENV !== 'production') {
    globalForDb.sql = sql
}

export default sql
