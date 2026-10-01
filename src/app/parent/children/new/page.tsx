// ============================================================================
// EntryDesk — Add Child Page (Parent)
// src/app/parent/children/new/page.tsx
// DPDP-compliant child creation form with explicit consent checkbox.
// Mobile-first. All fields pre-filled where possible.
// ============================================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import sql from '@/lib/db'
import { AddChildForm } from './add-child-form'

export const metadata: Metadata = {
    title: 'Add a Profile — EntryDesk',
}

interface AddChildPageProps {
    searchParams: Promise<{ dojo?: string }>
}

export default async function AddChildPage({ searchParams }: AddChildPageProps) {
    const { user } = await requireRole('parent', { redirectTo: '/login' })
    const { dojo: paramDojoSlug } = await searchParams
    const cookieStore = await cookies()
    const cookieDojoSlug = cookieStore.get('parent_dojo_slug')?.value
    const targetSlug = paramDojoSlug || cookieDojoSlug

    let availableDojos: { id: string; name: string; slug: string | null; coach_name: string | null }[] = []

    // 1. Curated dojo from invite link or cookie
    if (targetSlug) {
        availableDojos = await sql<{ id: string; name: string; slug: string | null; coach_name: string | null }[]>`
            SELECT
                d.id,
                d.name,
                d.slug,
                u.full_name AS coach_name
            FROM dojos d
            JOIN users u ON d.coach_id = u.id
            WHERE d.slug = ${targetSlug} AND d.join_link_enabled = TRUE
            LIMIT 1
        `
    }

    // 2. If no slug or not found, check dojos of existing registered athletes for this parent
    if (availableDojos.length === 0) {
        availableDojos = await sql<{ id: string; name: string; slug: string | null; coach_name: string | null }[]>`
            SELECT DISTINCT
                d.id,
                d.name,
                d.slug,
                u.full_name AS coach_name
            FROM students s
            JOIN dojos d ON s.dojo_id = d.id
            JOIN users u ON d.coach_id = u.id
            WHERE s.parent_id = ${user.id} AND d.join_link_enabled = TRUE
            ORDER BY d.name ASC
        `
    }

    // 3. Fallback: If only 1 active dojo exists across the platform, auto-link to it
    if (availableDojos.length === 0) {
        const platformDojos = await sql<{ id: string; name: string; slug: string | null; coach_name: string | null }[]>`
            SELECT
                d.id,
                d.name,
                d.slug,
                u.full_name AS coach_name
            FROM dojos d
            JOIN users u ON d.coach_id = u.id
            WHERE d.join_link_enabled = TRUE
            ORDER BY d.created_at ASC
            LIMIT 2
        `
        if (platformDojos.length === 1) {
            availableDojos = platformDojos
        }
    }

    return (
        <div className="space-y-5">
            {/* Back link */}
            <Link
                href="/athlete"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to my profile(s)
            </Link>

            <div>
                <h1 className="text-xl font-bold">Add a profile</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Your coach will see these details in their roster.
                </p>
            </div>

            <AddChildForm dojos={availableDojos} />
        </div>
    )
}
