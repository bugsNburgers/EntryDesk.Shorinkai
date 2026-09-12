import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const [,, email, password, fullName, role = 'coach'] = process.argv

if (!email || !password || !fullName) {
    console.log('\nUsage:')
    console.log('  node scripts/create-user.mjs <email> <password> <fullName> [role]')
    console.log('\nRoles: coach | organizer | admin (default: coach)')
    console.log('\nExample:')
    console.log('  node scripts/create-user.mjs coach@dojo.com mySecurePass123 "Sensei John" coach\n')
    process.exit(1)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is required.')
    process.exit(1)
}

const sql = postgres(connectionString, {
    ssl: connectionString.includes('sslmode=require') ? 'require' : connectionString.includes('localhost') ? false : 'prefer'
})

async function main() {
    try {
        const cleanEmail = email.trim().toLowerCase()
        const hash = await bcrypt.hash(password, 12)

        const [user] = await sql`
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (${cleanEmail}, ${hash}, ${fullName.trim()}, ${role}, TRUE)
            ON CONFLICT (email) DO UPDATE 
            SET 
                password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                is_active = TRUE,
                updated_at = NOW()
            RETURNING id, email, full_name, role
        `

        console.log('\n✅ User successfully created / updated:')
        console.log(`  ID:    ${user.id}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Name:  ${user.full_name}`)
        console.log(`  Role:  ${user.role}\n`)
    } catch (err) {
        console.error('Failed to create user:', err.message)
    } finally {
        await sql.end()
    }
}

main()
