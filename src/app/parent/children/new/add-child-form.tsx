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
import { createChildAsParent } from '@/app/parent/actions'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2, ShieldCheck, Building2, Camera, Upload, CheckCircle2 } from 'lucide-react'
import { compressAthletePhoto, type CompressionResult } from '@/lib/image-compression'
import { PhotoGuidelinesVisual } from '@/components/ui/photo-guidelines'
import { DobPicker } from '@/components/ui/dob-picker'

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
            className="h-12 w-full text-sm font-semibold"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding profile…
                </>
            ) : (
                'Add profile'
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
                            Back to My Profile(s)
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form ref={formRef} action={handleAction} className="space-y-5">
            {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dojo info: Auto-locked if single curated dojo, otherwise choice between parent's joined dojos */}
            {dojos.length === 1 ? (
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Dojo / Training Club
                    </Label>
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
                <Label className="text-sm font-medium">
                    Athlete photo <span className="text-destructive">*</span>
                </Label>
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

                    <div className="space-y-1.5 flex-1">
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
                                className="h-9 gap-1.5 text-xs cursor-pointer font-medium"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                {photoUrl ? 'Change photo' : 'Upload face photo'}
                            </Button>
                            {photoUrl && (
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                </span>
                            )}
                        </div>
                        <div className="space-y-0.5 pt-0.5">
                            <p className="text-[11px] text-muted-foreground leading-snug">
                                <span className="font-medium text-foreground">Formats:</span> JPG, PNG, WebP, HEIC
                            </p>
                            <p className="text-[10.5px] text-muted-foreground/80 leading-snug">
                            </p>
                        </div>
                    </div>
                </div>

                {/* Open Photo Rules with Real DO / DON'T Examples */}
                <PhotoGuidelinesVisual roleLabel="athlete" compact={true} />

                <input type="hidden" name="photo_url" value={photoUrl || ''} />
            </div>

            {/* Athlete name */}
            <div className="space-y-2">
                <Label htmlFor="name">
                    Athlete&apos;s full name <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Aarav Sharma"
                    required
                    maxLength={100}
                    className="h-11"
                    autoComplete="off"
                />
            </div>

            {/* Gender */}
            <div className="space-y-2">
                <Label htmlFor="gender">
                    Gender <span className="text-destructive">*</span>
                </Label>
                <Select name="gender" required>
                    <SelectTrigger id="gender" className="h-11">
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date of birth */}
            <div className="space-y-2">
                <Label htmlFor="date_of_birth">
                    Date of birth <span className="text-destructive">*</span>
                </Label>
                <DobPicker
                    id="date_of_birth"
                    name="date_of_birth"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Used to automatically assign the right tournament age category.
                </p>
            </div>

            {/* Belt rank */}
            <div className="space-y-2">
                <Label htmlFor="rank">
                    Belt rank <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="rank"
                    name="rank"
                    type="text"
                    placeholder="e.g. Yellow Belt, 5th Kyu"
                    maxLength={50}
                    className="h-11"
                    required
                />
            </div>

            {/* Weight */}
            <div className="space-y-2">
                <Label htmlFor="weight">
                    Weight (kg) <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="weight"
                    name="weight"
                    type="number"
                    min="5"
                    max="200"
                    step="0.1"
                    placeholder="e.g. 35"
                    className="h-11"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Used for weight category matching. Your coach can update this before registration.
                </p>
            </div>

            {/* School / city */}
            <div className="space-y-2">
                <Label htmlFor="school_or_city">
                    School or city <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="school_or_city"
                    name="school_or_city"
                    type="text"
                    placeholder="e.g. Crux Public School, Bangalore"
                    maxLength={100}
                    className="h-11"
                    required
                />
            </div>

            {/* Phone */}
            <div className="space-y-2">
                <Label htmlFor="phone">Mobile number (optional)</Label>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    className="h-11"
                    autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                    Shared with your coach for quick tournament communication.
                </p>
            </div>

            {/* DPDP Consent */}
            <div className="space-y-2">
                <Label htmlFor="consent">
                    Consent &amp; Declaration <span className="text-destructive">*</span>
                </Label>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/10 dark:bg-primary/5">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="consent"
                            name="consent"
                            checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                            required
                        />
                        <label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer select-none">
                            <span className="font-medium text-foreground">I confirm I am either this athlete (18+) or the parent / lawful guardian</span> of this
                            athlete and I consent to processing personal data (name, date of birth, gender,
                            belt rank, weight, photo, school/city) for karate tournament registration on EntryDesk.{' '}
                            <a href="/privacy" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                                Privacy Policy
                            </a>
                        </label>
                    </div>
                </div>
            </div>

            <SubmitButton />
        </form>
    )
}
