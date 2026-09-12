import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
    }
    return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Constant-time comparison between plaintext password and stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false
    try {
        return await bcrypt.compare(password, hash)
    } catch {
        return false
    }
}
