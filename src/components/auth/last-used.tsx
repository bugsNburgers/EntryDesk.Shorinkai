'use client'

// "Not you? Use a different account" — forgets the remembered sign-in hint for this browser
// (only the cosmetic cookie, never a session) and re-renders /login with every sign-in option.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { forgetLastLogin } from '@/app/login/actions'

export function NotYouButton({ label = 'Not you? Use a different account' }: { label?: string }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    return (
        <button
            type="button"
            disabled={pending}
            onClick={() =>
                startTransition(async () => {
                    await forgetLastLogin()
                    router.refresh()
                })
            }
            className="flex min-h-11 w-full items-center justify-center text-[15px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
            {label}
        </button>
    )
}
