'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { verifyGoogleLogin } from '@/app/login/actions'
import { useRouter } from 'next/navigation'

interface GoogleSignInButtonProps {
    clientId: string
    onError?: (errorMsg: string) => void
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string
                        callback: (response: { credential: string }) => void
                        auto_select?: boolean
                        cancel_on_tap_outside?: boolean
                    }) => void
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            theme?: 'outline' | 'filled_blue' | 'filled_black'
                            size?: 'large' | 'medium' | 'small'
                            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
                            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
                            logo_alignment?: 'left' | 'center'
                            width?: number
                        }
                    ) => void
                }
            }
        }
    }
}

export function GoogleSignInButton({ clientId, onError }: GoogleSignInButtonProps) {
    const router = useRouter()
    const buttonRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    useEffect(() => {
        if (!scriptLoaded || !clientId || !window.google || !buttonRef.current) return

        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: async (response) => {
                    setIsLoading(true)
                    try {
                        const result = await verifyGoogleLogin(response.credential)
                        if (result.success) {
                            window.location.href = '/dashboard'
                        } else {
                            setIsLoading(false)
                            if (onError && result.error) {
                                onError(result.error)
                            }
                        }
                    } catch {
                        setIsLoading(false)
                        onError?.('An error occurred while communicating with the server.')
                    }
                },
            })

            buttonRef.current.innerHTML = ''
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 380,
            })
        } catch (err) {
            console.error('Google button initialization failed', err)
        }
    }, [scriptLoaded, clientId, onError, router])

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={() => setScriptLoaded(true)}
            />
            {isLoading && (
                <div className="flex items-center gap-2 mb-3 text-sm text-primary animate-pulse">
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Verifying Google authorization...
                </div>
            )}
            <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />
            {!clientId && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    (Google Sign-In ready. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env)
                </p>
            )}
        </div>
    )
}
