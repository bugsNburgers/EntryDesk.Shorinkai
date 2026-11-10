'use client'

// ============================================================================
// EntryDesk — Add Child Form (Parent Portal)
// Full DPDP-compliant form with explicit consent checkbox.
// Auto-reads pendingDojoSlug from sessionStorage set by JoinDojoHandler.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { createChildAsParent } from '@/app/athlete/actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2, ShieldCheck, Building2, Camera, Upload, CheckCircle2 } from 'lucide-react'
import { compressAthletePhoto, type CompressionResult } from '@/lib/image-compression'
import { PhotoGuidelinesVisual } from '@/components/ui/photo-guidelines'
import { DobSelects } from '@/components/ui/dob-selects'
import { BeltPicker } from '@/components/ui/belt-picker'

interface Dojo {
    id: string
    name: string
    slug: string | null
    coach_name: string | null
}

interface AddChildFormProps {
    dojos: Dojo[]
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm transition-all"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                </>
            ) : (
                'Save child'
            )}
        </Button>
    )
}

export function AddChildForm({ dojos }: AddChildFormProps) {
    const [error, setError] = useState<string | null>(null)
    const [selectedDojoId, setSelectedDojoId] = useState<string>(dojos[0]?.id || '')
    const [consentChecked, setConsentChecked] = useState(false)
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [isCompressing, setIsCompressing] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // Read pending dojo slug from sessionStorage (set by JoinDojoHandler) if available
    useEffect(() => {
        const pendingSlug = sessionStorage.getItem('pendingDojoSlug')
        if (pendingSlug) {
            const matched = dojos.find((d) => d.slug === pendingSlug)
            if (matched) {
                setSelectedDojoId(matched.id)
            }
            sessionStorage.removeItem('pendingDojoSlug')
        } else if (!selectedDojoId && dojos.length > 0) {
            setSelectedDojoId(dojos[0].id)
        }
    }, [dojos, selectedDojoId])

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setIsCompressing(true)

        try {
            const result: CompressionResult = await compressAthletePhoto(file)
            setPhotoUrl(result.dataUrl)
        } catch (err: any) {
            setError(err.message || 'Failed to process selected photo.')
        } finally {
            setIsCompressing(false)
            if (photoInputRef.current) photoInputRef.current.value = ''
        }
    }

    async function handleAction(formData: FormData) {
        setError(null)
        if (!consentChecked) {
            setError('You must confirm that you are the athlete or their lawful parent/guardian.')
            return
        }

        const dojoIdToUse = selectedDojoId || (dojos.length === 1 ? dojos[0].id : '')
        if (!dojoIdToUse) {
            setError('No dojo selected. Please use your coach\'s invite link.')
            return
        }

        if (!photoUrl) {
            setError('Athlete photo is required. Please upload a clear face photo.')
            return
        }

        formData.set('consent', 'on')
        formData.set('dojo_id', dojoIdToUse)
        formData.set('photo_url', photoUrl)

        const result = await createChildAsParent(formData)
        if (result?.error) {
            setError(result.error)
        }
    }

    if (dojos.length === 0) {
        return (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center space-y-4 dark:border-amber-500/10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <Building2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">No Dojo Linked Yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        To add an athlete, please ask your coach for their curated invite link (e.g. <code>entrydesk.com/join/their-dojo</code>).
                    </p>
                </div>
                <div>
                    <Link href="/athlete">
                        <Button variant="outline" size="sm">
                            Back to My children
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form ref={formRef} action={handleAction} className="space-y-5">
            {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-base font-semibold text-destructive" role="alert">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dojo info: Auto-locked if single curated dojo, otherwise choice between parent's joined dojos */}
            {dojos.length === 1 ? (
                <div className="space-y-1.5">
                    <span className="block text-base font-bold">Dojo</span>
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-4 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <p className="text-base font-semibold text-foreground">
                                    {dojos[0].name}
                                </p>
                                {dojos[0].coach_name && (
                                    <p className="text-xs text-muted-foreground">
                                        Coached by <span className="font-medium text-foreground">{dojos[0].coach_name}</span>
                                    </p>
                                )}
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary shrink-0">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Linked Dojo
                            </span>
                        </div>
                    </div>
                    <input type="hidden" name="dojo_id" value={dojos[0].id} />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="dojo_id">
                        Dojo / Training Club <span className="text-destructive">*</span>
                    </Label>
                    <Select value={selectedDojoId} onValueChange={setSelectedDojoId} required>
                        <SelectTrigger id="dojo_id" className="h-11">
                            <SelectValue placeholder="Select your dojo" />
                        </SelectTrigger>
                        <SelectContent>
                            {dojos.map((dojo) => (
                                <SelectItem key={dojo.id} value={dojo.id}>
                                    <div>
                                        <span className="font-medium">{dojo.name}</span>
                                        {dojo.coach_name && (
                                            <span className="ml-1.5 text-xs text-muted-foreground">
                                                · {dojo.coach_name}
                                            </span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Athlete Photo (Compulsory for official tournament ID card) */}
            <div className="space-y-2">
                <span className="block text-base font-bold">Photo for the ID card</span>
                <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 dark:bg-white/[0.02]">
                    <div className="relative group shrink-0">
                        <div className="h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/40 relative shadow-sm">
                            {photoUrl ? (
                                <Image
                                    src={photoUrl}
                                    alt="Athlete Preview"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="text-center p-2">
                                    <Camera className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                                </div>
                            )}

                            {isCompressing && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        {photoUrl && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                <CheckCircle2 className="h-3 w-3" />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            className="hidden"
                            onChange={handlePhotoSelect}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isCompressing}
                                onClick={() => photoInputRef.current?.click()}
                                className="min-h-12 w-full whitespace-normal gap-2 text-base cursor-pointer font-semibold"
                            >
                                <Upload className="h-5 w-5" aria-hidden="true" />
                                {photoUrl ? 'Change photo' : 'Take or choose a photo'}
                            </Button>
                            {photoUrl && (
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                </span>
                            )}
                        </div>
                        <div className="space-y-0.5 pt-0.5">

                        </div>
                    </div>
                </div>

                {/* Open Photo Rules with Real DO / DON'T Examples */}
                <PhotoGuidelinesVisual roleLabel="athlete" compact={true} />

                <input type="hidden" name="photo_url" value={photoUrl || ''} />
            </div>

            {/* 2-Column Responsive Input Grid on tablet / PC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Athlete name */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-bold">
                        Child&apos;s full name
                    </Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g. Aarav Sharma"
                        required
                        maxLength={100}
                        className="h-12 text-base"
                        autoComplete="off"
                    />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <span className="block text-base font-bold" id="gender-label">Boy or girl</span>
                    <div role="radiogroup" aria-labelledby="gender-label" className="grid grid-cols-2 gap-2">
                        {[
                            { v: 'male', l: 'Boy / Male' },
                            { v: 'female', l: 'Girl / Female' },
                        ].map((g, i) => (
                            <label
                                key={g.v}
                                className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-3 text-base font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                            >
                                <input type="radio" name="gender" value={g.v} required={i === 0} className="h-5 w-5 accent-[var(--primary)]" />
                                {g.l}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Date of birth */}
                <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="text-base font-bold">
                        Date of birth
                    </Label>
                    <DobSelects id="date_of_birth" name="date_of_birth" required />
                </div>

                {/* Belt rank */}
                <div className="space-y-2">
                    <span className="block text-base font-bold">Belt colour</span>
                    <BeltPicker name="rank" required />
                    <p className="text-[15px] text-muted-foreground">Not sure? Ask your coach. They can change it later.</p>
                </div>

                {/* Weight */}
                <div className="space-y-2">
                    <Label htmlFor="weight" className="text-base font-bold">
                        Weight
                    </Label>
                    <div className="flex">
                        <Input
                            id="weight"
                            name="weight"
                            type="number"
                            inputMode="decimal"
                            min="5"
                            max="200"
                            step="0.1"
                            placeholder="e.g. 35"
                            className="h-12 rounded-r-none text-base"
                            required
                        />
                        <span className="flex h-12 items-center rounded-r-md border border-l-0 border-input bg-muted px-4 font-semibold">kg</span>
                    </div>
                </div>

                {/* School / city */}
                <div className="space-y-2">
                    <Label htmlFor="school_or_city" className="text-base font-bold">
                        School or city
                    </Label>
                    <Input
                        id="school_or_city"
                        name="school_or_city"
                        type="text"
                        placeholder="e.g. Crux Public School, Pune"
                        maxLength={100}
                        className="h-12 text-base"
                        required
                    />
                </div>

                {/* Phone */}
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone" className="text-base font-bold">
                        Your mobile number <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="98765 43210"
                        maxLength={20}
                        className="h-12 text-base"
                        autoComplete="tel"
                    />
                    <p className="text-[15px] text-muted-foreground">Only your coach sees it.</p>
                </div>
            </div>

            {/* DPDP consent (plain words; same checkbox name and requirement) */}
            <label
                htmlFor="consent"
                className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4"
            >
                <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[var(--primary)]"
                    required
                />
                <span className="text-base leading-relaxed">
                    I am this child&apos;s parent or guardian (or I am the athlete and 18 or older), and EntryDesk can use these
                    details for tournament entry.{' '}
                    <a href="/privacy" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                        Privacy policy
                    </a>
                </span>
            </label>

            <SubmitButton />
        </form>
    )
}
