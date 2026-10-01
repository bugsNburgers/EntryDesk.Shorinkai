'use client'

// ============================================================================
// EntryDesk — Global Error Boundary
// Catches errors in the root layout itself (e.g. font loading failures).
// This replaces the entire HTML output including <html> and <body>.
// ============================================================================

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GlobalError]', error.message, error.digest)
    }, [error])

    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: 'hsl(240 10% 4%)', color: 'hsl(0 0% 98%)' }}>
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(239,68,68,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            fontSize: 32,
                        }}
                    >
                        ⚠
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                        EntryDesk encountered a critical error
                    </h1>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 360, lineHeight: 1.6, marginBottom: 24 }}>
                        A critical error occurred while loading the app. We&apos;ve logged it and will investigate.
                        {error.digest && (
                            <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                Ref: {error.digest}
                            </span>
                        )}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            background: 'hsl(220 90% 56%)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
