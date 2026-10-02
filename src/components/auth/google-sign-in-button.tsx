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
                    prompt?: () => void
                }
            }
        }
    }
}

export function GoogleSignInButton({ clientId, onError }: GoogleSignInButtonProps) {
    const router = useRouter()
    const buttonRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const effectiveClientId = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

    // Detect if Google script is already loaded on window (e.g. from previous navigation)
    const [scriptLoaded, setScriptLoaded] = useState(() => {
        return typeof window !== 'undefined' && Boolean(window.google?.accounts?.id)
    })

    // Active polling fallback in case next/script onLoad/onReady is bypassed during client navigation
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.google?.accounts?.id) {
            setScriptLoaded(true)
            return
        }

        const interval = setInterval(() => {
            if (window.google?.accounts?.id) {
                setScriptLoaded(true)
                clearInterval(interval)
            }
        }, 120)

        const timeout = setTimeout(() => clearInterval(interval), 5000)
        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [])

    useEffect(() => {
        if (!effectiveClientId || !buttonRef.current) return
        if (!window.google?.accounts?.id) return

        try {
            window.google.accounts.id.initialize({
                client_id: effectiveClientId,
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
            const parentWidth = buttonRef.current.parentElement?.clientWidth || 380
            const buttonWidth = Math.min(380, Math.max(260, parentWidth))

            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: buttonWidth,
            })
        } catch (err) {
            console.error('Google button initialization failed', err)
        }
    }, [scriptLoaded, effectiveClientId, onError, router])

    const handleFallbackClick = () => {
        if (window.google?.accounts?.id && effectiveClientId) {
            try {
                window.google.accounts.id.prompt?.()
            } catch {
                // Ignore prompt error if already initialized
            }
        }
    }

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <Script
                src="https://accounts.google.com/gsi/client?hl=en"
                strategy="afterInteractive"
                onLoad={() => setScriptLoaded(true)}
                onReady={() => setScriptLoaded(true)}
            />
            {isLoading && (
                <div className="flex items-center gap-2 mb-3 text-sm text-primary animate-pulse">
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Verifying Google authorization...
                </div>
            )}
            <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]">
                {/* Instant visual fallback button while Google's iframe initializes */}
                <button
                    type="button"
                    onClick={handleFallbackClick}
                    className="w-full max-w-[380px] h-[44px] rounded-md border border-[#ded8cb] dark:border-white/[0.15] bg-white dark:bg-[#111a2b] hover:bg-[#f8f6f0] dark:hover:bg-[#16233a] flex items-center justify-center gap-3 px-4 text-[14px] font-medium text-[#3c4043] dark:text-[#e8eef5] shadow-2xs transition-colors"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>
            </div>
            {!effectiveClientId && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    (Google Sign-In ready. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env)
                </p>
            )}
        </div>
    )
}
