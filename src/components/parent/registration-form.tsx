'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trophy, CheckCircle2, AlertCircle, Loader2, Camera, ArrowRight } from 'lucide-react'
import { submitParentEntry } from '@/app/athlete/entry-actions'
import { PhotoUploadDialog } from '@/components/ui/photo-upload-dialog'
import { daysLeftText, formatDateRangeStable, formatDateStable, weekdayName } from '@/lib/date'

export interface EventDayOption {
    id: string
    date: string | Date
    name: string | null
}

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
    days?: EventDayOption[]
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
    // The error banner sits at the top of a long form; bring it into view so a failed submit is never silent.
    const errorRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [error])
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [photoUrl, setPhotoUrl] = useState<string | null>(child.photo_url)
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

    // An event counts as "already entered" unless that entry was cancelled, declined or sent back for a fix.
    const isEntered = (t: TournamentOption) =>
        Boolean(t.existing_entry_id) &&
        t.existing_entry_status !== 'withdrawn' &&
        t.existing_entry_status !== 'coach_declined' &&
        t.existing_entry_status !== 'correction_needed'
    const openTournaments = tournaments.filter((t) => !isEntered(t))
    const initialEventId =
        (preselectedEventId && openTournaments.some((t) => t.id === preselectedEventId) ? preselectedEventId : '') ||
        (openTournaments.length === 1 ? openTournaments[0].id : '')

    // Form states
    const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)

    const selectedTournament = tournaments.find((t) => t.id === selectedEventId)

    const [selectedDayId, setSelectedDayId] = useState<string>(() => {
        const initT = tournaments.find((t) => t.id === initialEventId)
        return initT?.days?.[0]?.id || ''
    })

    const handleSelectTournament = (eventId: string) => {
        setSelectedEventId(eventId)
        const t = tournaments.find((x) => x.id === eventId)
        if (t?.days && t.days.length > 0) {
            setSelectedDayId(t.days[0].id)
        } else {
            setSelectedDayId('')
        }
    }

    const [kata, setKata] = useState(true)
    const [kumite, setKumite] = useState(true)
    const individualType: 'both' | 'kata' | 'kumite' = kata && kumite ? 'both' : kata ? 'kata' : 'kumite'
    const [teamKata, setTeamKata] = useState(false)
    const [teamKumite, setTeamKumite] = useState(false)
    const [weightSame, setWeightSame] = useState<boolean>(Boolean(child.weight))
    const [weightStr, setWeightStr] = useState<string>(child.weight ? String(child.weight) : '')

    const parsedWeight = parseFloat(weightStr)
    const currentWeight = weightSame ? child.weight : !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : child.weight
    const firstName = child.name.split(' ')[0]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if (!selectedEventId) {
            setError('Choose a tournament first.')
            return
        }

        if (!kata && !kumite) {
            setError('Tick Kata, Kumite, or both.')
            return
        }

        if (!weightSame && !(parsedWeight > 0)) {
            setError(`Type ${firstName}'s weight in kg.`)
            return
        }

        if (selectedTournament?.days && selectedTournament.days.length > 0 && !selectedDayId) {
            setError(`Choose which day ${firstName} will come.`)
            return
        }

        if (selectedTournament?.photo_required && !photoUrl) {
            setError(
                'This tournament needs a photo. Tap "Add photo" first.'
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
                event_day_id: selectedDayId || null,
            })

            if (res.error) {
                setError(res.error)
            } else if (res.success && res.entry_id) {
                setSuccessMessage('Sent. Opening the entry…')
                router.push(`/athlete/entries/${res.entry_id}`)
                router.refresh()
            }
        })
    }

    const step = (n: number, text: string) => (
        <legend className="mb-3 flex items-center gap-2.5 text-lg font-bold">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[15px] text-background">{n}</span>
            {text}
        </legend>
    )
    const optionCls = (on: boolean, disabled = false) =>
        `flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
            disabled
                ? 'cursor-default border-border bg-muted/50'
                : on
                ? 'cursor-pointer border-primary bg-primary/5'
                : 'cursor-pointer border-border bg-card hover:border-foreground/30'
        }`
    const hasDays = Boolean(selectedTournament?.days && selectedTournament.days.length > 0)
    let n = 1

    if (tournaments.length === 0) {
        return (
            <div className="space-y-4 rounded-2xl border border-dashed p-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-lg font-bold">No tournaments open right now</h2>
                <p className="mx-auto max-w-sm text-base text-muted-foreground">
                    When {child.coach_name || 'your coach'} joins a tournament, it shows here.
                </p>
                <Link
                    href={`/athlete/${child.id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-border px-5 text-base font-semibold"
                >
                    Back
                </Link>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
                <div ref={errorRef} role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="flex items-center gap-2.5 rounded-xl border border-[var(--status-approved)]/40 bg-[var(--status-approved-bg)] p-4 text-base text-[var(--status-approved-fg)]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{successMessage}</span>
                </div>
            )}

            <fieldset>
                {step(n++, 'Which tournament?')}
                <div className="grid gap-2.5">
                    {tournaments.map((t) => {
                        const entered = isEntered(t)
                        const left = daysLeftText(t.registration_close_date)
                        const body = (
                            <span className="min-w-0 flex-1">
                                <span className="block text-base font-bold">{t.title}</span>
                                <span className="block text-[15px] text-muted-foreground">
                                    {formatDateRangeStable(t.start_date, t.end_date)}
                                    {t.location ? ` · ${t.location}` : ''}
                                </span>
                                {entered ? (
                                    <span className="block text-[15px] font-semibold text-[var(--status-approved-fg)]">Already entered</span>
                                ) : t.registration_close_date ? (
                                    <span className="block text-[15px] font-semibold text-[var(--status-pending-fg)]">
                                        Last day to enter {formatDateStable(t.registration_close_date)}
                                        {left ? ` · ${left}` : ''}
                                    </span>
                                ) : null}
                                {t.photo_required && !entered && (
                                    <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Camera className="h-4 w-4" aria-hidden="true" /> Needs a photo
                                    </span>
                                )}
                            </span>
                        )
                        return entered ? (
                            <div key={t.id} className={optionCls(false, true)}>
                                {body}
                                <Link
                                    href={`/athlete/entries/${t.existing_entry_id}`}
                                    className="inline-flex min-h-11 shrink-0 items-center px-2 text-base font-semibold text-primary"
                                >
                                    See it
                                </Link>
                            </div>
                        ) : (
                            <label key={t.id} className={optionCls(selectedEventId === t.id)}>
                                <input
                                    type="radio"
                                    name="tournament"
                                    className="h-6 w-6 shrink-0 accent-[var(--primary)]"
                                    checked={selectedEventId === t.id}
                                    onChange={() => handleSelectTournament(t.id)}
                                />
                                {body}
                            </label>
                        )
                    })}
                </div>
                {openTournaments.length === 0 && (
                    <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-base">
                        {firstName} is already in every open tournament. Nothing more to do here.
                    </p>
                )}
            </fieldset>

            {selectedTournament && hasDays && (
                <fieldset>
                    {step(n++, `Which day will ${firstName} come?`)}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {selectedTournament.days!.map((day) => (
                            <label key={day.id} className={optionCls(selectedDayId === day.id)}>
                                <input
                                    type="radio"
                                    name="day"
                                    className="h-6 w-6 shrink-0 accent-[var(--primary)]"
                                    checked={selectedDayId === day.id}
                                    onChange={() => setSelectedDayId(day.id)}
                                />
                                <span>
                                    <span className="block text-base font-bold">{formatDateStable(day.date)}</span>
                                    <span className="block text-[15px] text-muted-foreground">
                                        {[weekdayName(day.date), day.name].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {selectedTournament && (
                <fieldset>
                    {step(n++, `What will ${firstName} play?`)}
                    <p className="-mt-1 mb-3 text-[15px] text-muted-foreground">Tick one or both.</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <label className={optionCls(kata)}>
                            <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--primary)]" checked={kata} onChange={(e) => setKata(e.target.checked)} />
                            <span>
                                <span className="block text-base font-bold">Kata</span>
                                <span className="block text-[15px] text-muted-foreground">Forms, performed alone</span>
                            </span>
                        </label>
                        <label className={optionCls(kumite)}>
                            <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--primary)]" checked={kumite} onChange={(e) => setKumite(e.target.checked)} />
                            <span>
                                <span className="block text-base font-bold">Kumite</span>
                                <span className="block text-[15px] text-muted-foreground">Fighting against another athlete</span>
                            </span>
                        </label>
                    </div>
                    <details className="mt-3" open={teamKata || teamKumite}>
                        <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-primary">Also in a team? (optional)</summary>
                        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <label className={optionCls(teamKata)}>
                                <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--primary)]" checked={teamKata} onChange={(e) => setTeamKata(e.target.checked)} />
                                <span>
                                    <span className="block text-base font-bold">Team Kata</span>
                                    <span className="block text-[15px] text-muted-foreground">3 athletes together</span>
                                </span>
                            </label>
                            <label className={optionCls(teamKumite)}>
                                <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--primary)]" checked={teamKumite} onChange={(e) => setTeamKumite(e.target.checked)} />
                                <span className="block text-base font-bold">Team Kumite</span>
                            </label>
                        </div>
                    </details>
                </fieldset>
            )}

            {selectedTournament && (
                <fieldset>
                    {child.weight ? (
                        <>
                            {step(n++, `Is ${firstName} still ${child.weight} kg?`)}
                            <div className="grid grid-cols-2 gap-2.5">
                                <label className={`${optionCls(weightSame)} justify-center`}>
                                    <input type="radio" name="weightSame" className="h-6 w-6 accent-[var(--primary)]" checked={weightSame} onChange={() => setWeightSame(true)} />
                                    <span className="text-base font-bold">Yes</span>
                                </label>
                                <label className={`${optionCls(!weightSame)} justify-center`}>
                                    <input type="radio" name="weightSame" className="h-6 w-6 accent-[var(--primary)]" checked={!weightSame} onChange={() => setWeightSame(false)} />
                                    <span className="text-base font-bold">No, change</span>
                                </label>
                            </div>
                        </>
                    ) : (
                        step(n++, `What is ${firstName}'s weight?`)
                    )}
                    {!weightSame && (
                        <label htmlFor="weight" className="mt-3 flex flex-col gap-1.5 text-base font-semibold">
                            Weight today
                            <span className="flex">
                                <Input
                                    id="weight"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="10"
                                    max="200"
                                    placeholder="e.g. 34.5"
                                    value={weightStr}
                                    onChange={(e) => setWeightStr(e.target.value)}
                                    className="h-12 rounded-r-none text-base"
                                />
                                <span className="flex h-12 items-center rounded-r-md border border-l-0 border-input bg-muted px-4 font-semibold">kg</span>
                            </span>
                        </label>
                    )}
                </fieldset>
            )}

            {selectedTournament?.photo_required && !photoUrl && (
                <div className="space-y-3 rounded-xl border border-[var(--status-pending)]/40 bg-[var(--status-pending-bg)] p-4 text-base">
                    <p className="font-semibold text-[var(--status-pending-fg)]">This tournament needs a photo of {firstName} for the ID card.</p>
                    <Button type="button" onClick={() => setPhotoDialogOpen(true)} className="min-h-12 gap-2 text-base">
                        <Camera className="h-5 w-5" aria-hidden="true" />
                        Add photo
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

            {selectedTournament && (
                <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                    <p className="text-base">
                        After you send, <b>{child.coach_name || 'your coach'}</b> checks it first. Then the organiser accepts it.
                    </p>
                    <Button type="submit" disabled={isPending || !selectedEventId} className="min-h-14 w-full gap-2 text-lg font-semibold">
                        {isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                                Sending…
                            </>
                        ) : (
                            <>
                                Send to coach
                                <ArrowRight className="h-5 w-5" aria-hidden="true" />
                            </>
                        )}
                    </Button>
                    <Link
                        href={`/athlete/${child.id}`}
                        className="flex min-h-12 items-center justify-center text-base font-semibold text-muted-foreground"
                    >
                        Cancel
                    </Link>
                </div>
            )}
        </form>
    )
}
