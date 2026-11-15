'use client'

// "Last used" badge + "Last signed in as p***@gmail.com · Not you?" line for the login and join pages.
// The data comes from the server-rendered hint cookie (src/lib/auth/last-login.ts) as plain props.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { forgetLastLogin } from '@/app/login/actions'
import { LAST_LOGIN_METHOD_LABEL, type LastLogin } from '@/lib/auth/last-login-core'

export function LastUsedBadge({ className = '' }: { className?: string }) {
    return (
        <span
            className={`pointer-events-none inline-flex shrink-0 items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground ${className}`}
        >
            Last used
        </span>
    )
}

export function LastLoginNotice({ lastLogin, className = '' }: { lastLogin: LastLogin; className?: string }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const forget = () => {
        startTransition(async () => {
            await forgetLastLogin()
            router.refresh()
        })
    }

    return (
        <p className={`text-[15px] text-muted-foreground ${className}`}>
            Last time you signed in with {LAST_LOGIN_METHOD_LABEL[lastLogin.method]} as{' '}
            <span className="font-semibold text-foreground">{lastLogin.maskedEmail}</span>.{' '}
            <button
                type="button"
                onClick={forget}
                disabled={pending}
                className="-my-2 py-2 font-semibold text-foreground underline underline-offset-4 disabled:opacity-50"
            >
                Not you?
            </button>
        </p>
    )
}
