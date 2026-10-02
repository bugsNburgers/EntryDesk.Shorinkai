'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Calendar,
    MapPin,
    Trophy,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Camera,
    ArrowRight,
    Scale,
} from 'lucide-react'
import { submitParentEntry } from '@/app/parent/entry-actions'
import { PhotoUploadDialog } from '@/components/ui/photo-upload-dialog'
import { formatDateRangeStable, formatDateStable } from '@/lib/date'

export interface TournamentOption {
    id: string
    title: string
    description: string | null
    start_date: string | Date
    end_date: string | Date
    location: string | null
    registration_close_date: string | Date | null
    photo_required: boolean
    coach_checks_each_entry: boolean
    existing_entry_id?: string | null
    existing_entry_status?: string | null
}

export interface ChildData {
    id: string
    name: string
    gender: string
    date_of_birth: string | Date | null
    rank: string | null
    weight: number | null
    photo_url: string | null
    dojo_name: string
    coach_name: string | null
}

interface RegistrationFormProps {
    child: ChildData
    tournaments: TournamentOption[]
    preselectedEventId?: string
}

export function RegistrationForm({
    child,
    tournaments,
    preselectedEventId,
}: RegistrationFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string | null>(child.photo_url)
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

    // Form states
    const [selectedEventId, setSelectedEventId] = useState<string>(
        preselectedEventId || (tournaments.length === 1 ? tournaments[0].id : '')
    )
    const [individualType, setIndividualType] = useState<'both' | 'kata' | 'kumite'>('both')
    const [teamKata, setTeamKata] = useState(false)
    const [teamKumite, setTeamKumite] = useState(false)
    const [weightStr, setWeightStr] = useState<string>(
        child.weight ? String(child.weight) : ''
    )

    const selectedTournament = tournaments.find((t) => t.id === selectedEventId)
    const parsedWeight = parseFloat(weightStr)
    const currentWeight = !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : child.weight


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if (!selectedEventId) {
            setError('Please select a tournament.')
            return
        }

        if (selectedTournament?.photo_required && !photoUrl) {
            setError(
                'This tournament requires a photo. Please click "Upload Photo Now" above before registering.'
            )
            return
        }

        const parts: string[] = [individualType]
        if (teamKata) parts.push('team_kata')
        if (teamKumite) parts.push('team_kumite')
        const finalParticipationType = parts.join(',')

        startTransition(async () => {
            const res = await submitParentEntry({
                student_id: child.id,
                event_id: selectedEventId,
                participation_type: finalParticipationType,
                declared_weight_kg: currentWeight ?? null,
            })

            if (res.error) {
                setError(res.error)
            } else if (res.success && res.entry_id) {
                setSuccessMessage('Registration submitted successfully! Redirecting...')
                router.push(`/athlete/entries/${res.entry_id}`)
                router.refresh()
            }
        })
    }

    if (tournaments.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed p-8 text-center bg-card/40 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Trophy className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold">No tournaments currently open</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        There are currently no active tournaments open for {child.dojo_name}.
                        Please check with coach {child.coach_name || 'your coach'} when the next registration window opens.
                    </p>
                </div>
                <div>
                    <Link href={`/athlete/${child.id}`}>
                        <Button variant="outline" size="sm">
                            Return to profile
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Registration Issue</p>
                        <p className="text-xs mt-0.5 opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Step 1: Select Tournament */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                            1
                        </span>
                        Choose Tournament
                    </Label>
                    <span className="text-xs text-muted-foreground">
                        {tournaments.length} open for {child.dojo_name}
                    </span>
                </div>

                {tournaments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center bg-muted/20">
                        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                        <h4 className="text-sm font-semibold mb-1">No Open Tournaments for {child.dojo_name}</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                            Tournaments will appear here once your coach applies and is approved by the tournament organizer. If your coach already applied, the organizer may still need to approve the application.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {tournaments.map((t) => {
                            const isSelected = selectedEventId === t.id
                            const isAlreadyRegistered =
                                t.existing_entry_id &&
                                t.existing_entry_status !== 'withdrawn' &&
                                t.existing_entry_status !== 'coach_declined'

                            return (
                                <div
                                    key={t.id}
                                    onClick={() => {
                                        if (!isAlreadyRegistered) {
                                            setSelectedEventId(t.id)
                                        }
                                    }}
                                    className={`relative rounded-xl border p-4 transition-all ${
                                        isAlreadyRegistered
                                            ? 'opacity-60 bg-muted/30 cursor-not-allowed border-border'
                                            : isSelected
                                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 cursor-pointer shadow-sm'
                                            : 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer bg-card'
                                    }`}
                                >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-sm sm:text-base">
                                                {t.title}
                                            </h4>
                                            {isAlreadyRegistered && (
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    Already Registered
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                {formatDateRangeStable(t.start_date, t.end_date)}
                                            </span>

                                            {t.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                                    {t.location}
                                                </span>
                                            )}

                                            {t.registration_close_date && (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    Closes:{' '}
                                                    {formatDateStable(t.registration_close_date)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isAlreadyRegistered ? (
                                        <Link
                                            href={`/athlete/entries/${t.existing_entry_id}`}
                                            className="text-xs text-primary font-medium hover:underline shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            View Entry →
                                        </Link>
                                    ) : (
                                        <div className="flex items-center shrink-0">
                                            <div
                                                className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                                                    isSelected
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-muted-foreground/40'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="h-2 w-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {t.photo_required && (
                                    <div className="mt-2.5 pt-2 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <Camera className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Photo is required by organiser for this event.</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    </div>
                )}
            </div>

            {/* Step 2: Events to Enter */}
            <div className="space-y-4">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        2
                    </span>
                    Events to Enter
                </Label>

                {/* Individual Events (Select 1 of 3) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Individual Events (Choose 1)
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { id: 'both', label: 'Kata & Kumite', desc: 'Form & Sparring' },
                            { id: 'kata', label: 'Kata Only', desc: 'Form demonstration' },
                            { id: 'kumite', label: 'Kumite Only', desc: 'Sparring match' },
                        ].map((opt) => {
                            const isSelected = individualType === opt.id
                            return (
                                <button
                                    type="button"
                                    key={opt.id}
                                    onClick={() => setIndividualType(opt.id as any)}
                                    className={`rounded-xl border p-3 text-left transition-all ${
                                        isSelected
                                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                                            : 'border-border hover:bg-muted/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs sm:text-sm font-bold">{opt.label}</p>
                                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ml-1 ${
                                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                                        }`}>
                                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Team Events (Both Selectable / Optional) */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Team Events (Optional · Select any)
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            {
                                id: 'team_kata',
                                label: 'Team Kata',
                                desc: 'Synchronized 3-person form',
                                selected: teamKata,
                                toggle: () => setTeamKata((prev) => !prev),
                            },
                            {
                                id: 'team_kumite',
                                label: 'Team Kumite',
                                desc: 'Team sparring rotation',
                                selected: teamKumite,
                                toggle: () => setTeamKumite((prev) => !prev),
                            },
                        ].map((opt) => {
                            return (
                                <button
                                    type="button"
                                    key={opt.id}
                                    onClick={opt.toggle}
                                    className={`rounded-xl border p-3 text-left transition-all ${
                                        opt.selected
                                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                                            : 'border-border hover:bg-muted/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs sm:text-sm font-bold">{opt.label}</p>
                                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ml-1 transition-colors ${
                                            opt.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                                        }`}>
                                            {opt.selected && (
                                                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Step 3: Competition Weight */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        3
                    </span>
                    Competition Weight (Optional)
                </Label>

                <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="weight" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Scale className="h-3.5 w-3.5 text-primary" />
                                Current Weight (kg)
                            </Label>
                            <span className="text-[11px] text-muted-foreground">
                                Profile: {child.weight ? `${child.weight} kg` : 'Not set'}
                            </span>
                        </div>
                        <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            min="10"
                            max="200"
                            placeholder="e.g. 34.5"
                            value={weightStr}
                            onChange={(e) => setWeightStr(e.target.value)}
                            className="h-10 text-sm"
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Declared weight for official weigh-in and kumite bouts. Leave blank or update if changed.
                    </p>
                </div>
            </div>

            {/* Photo Warning if required and missing */}
            {selectedTournament?.photo_required && !photoUrl && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        <span>Photo Required for this Tournament</span>
                    </div>
                    <p className="text-muted-foreground">
                        This tournament requires a passport-size photo of {child.name} for the tournament ID card.
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setPhotoDialogOpen(true)}
                        className="rounded-md gap-2 font-semibold text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        <Camera className="h-4 w-4" />
                        Upload Photo Now
                    </Button>
                </div>
            )}

            <PhotoUploadDialog
                open={photoDialogOpen}
                onOpenChange={setPhotoDialogOpen}
                studentId={child.id}
                studentName={child.name}
                currentPhotoUrl={photoUrl}
                onSuccess={(newUrl) => setPhotoUrl(newUrl)}
            />

            {/* Coach Review notice */}
            <div className="rounded-xl bg-muted/40 border p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Coach Review Gate</p>
                <p>
                    {selectedTournament?.coach_checks_each_entry !== false
                        ? `Once submitted, your entry will be sent to Coach ${child.coach_name || 'your dojo coach'} for verification before forwarding to the organiser.`
                        : `Your entry will be submitted directly to the tournament organiser.`}
                </p>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                    type="submit"
                    disabled={isPending || !selectedEventId}
                    className="w-full sm:w-auto h-11 px-8 text-sm font-semibold rounded-md"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Submitting Registration...
                        </>
                    ) : (
                        <>
                            Submit Registration
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                    )}
                </Button>

                <Link href={`/athlete/${child.id}`} className="w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto text-sm text-muted-foreground"
                    >
                        Cancel
                    </Button>
                </Link>
            </div>
        </form>
    )
}
