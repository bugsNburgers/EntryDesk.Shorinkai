import { destroySession } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function POST() {
    await destroySession()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function GET() {
    await destroySession()
    revalidatePath('/', 'layout')
    redirect('/login')
}
