'use client'

// ============================================================================
// EntryDesk — Coach Athlete Registration Modal
// Clean, focused single-column form with segmented controls, authentic belt styling,
// live computed division banner, and 1-click WhatsApp pass delivery.
// ============================================================================

import React, { useState, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    UserPlus,
    Users,
    CheckCircle2,
    Share2,
    Copy,
    Check,
    Loader2,
    Sparkles,
    Shield,
    Phone,
    Calendar,
    Award,
    Trophy,
    User,
    Flame,
} from 'lucide-react'
import { calculateCategory } from '@/lib/category'
import { coachAddManualStudentAndEntry } from '@/app/dashboard/entries/actions'
import { toast } from 'sonner'
import { isSimpleEntryEventType } from '@/lib/events/type'
import { normalizeDobToIso } from '@/lib/date'

const BELT_CONFIGS: Record<string, { label: string; hex: string }> = {
    white: { label: 'White Belt', hex: '#E4E4E7' },
    yellow: { label: 'Yellow Belt', hex: '#FACC15' },
    orange: { label: 'Orange Belt', hex: '#F97316' },
    green: { label: 'Green Belt', hex: '#059669' },
    blue: { label: 'Blue Belt', hex: '#2563EB' },
    purple: { label: 'Purple Belt', hex: '#9333EA' },
    brown_3: { label: 'Brown Belt (3rd Kyu)', hex: '#5C3A21' },
    brown_2: { label: 'Brown Belt (2nd Kyu)', hex: '#5C3A21' },
    brown_1: { label: 'Brown Belt (1st Kyu)', hex: '#5C3A21' },
    black_1: { label: 'Black Belt (1st Dan)', hex: '#09090B' },
    black_2: { label: 'Black Belt (2nd Dan)', hex: '#09090B' },
    black_3: { label: 'Black Belt (3rd Dan+)', hex: '#09090B' },
}

function formatDateLabel(val: any): string {
    if (!val) return ''
    if (typeof val === 'string') return val.slice(0, 10)
    if (val instanceof Date) return val.toISOString().slice(0, 10)
    return String(val).slice(0, 10)
}

interface CoachAddStudentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: {
        id: string
        title: string
        location?: string | null
        start_date?: string
        event_type?: string | null
    }
    eventType?: string | null
    eventDays?: { id: string; name?: string; date: any }[]
    dojos: { id: string; name: string }[]
    students: any[]
    existingStudentIds: Set<string>
}

export function CoachAddStudentDialog({
    open,
    onOpenChange,
    event,
    eventType,
    eventDays = [],
    dojos,
    students,
    existingStudentIds,
}: CoachAddStudentDialogProps) {
    // Mode: 'manual' (new student) vs 'roster' (select existing)
    const [mode, setMode] = useState<'manual' | 'roster'>('manual')

    const availableRosterStudents = useMemo(() => {
        return students.filter((s) => !existingStudentIds.has(s.id))
    }, [students, existingStudentIds])

    // Form fields
    const [selectedStudentId, setSelectedStudentId] = useState<string>('')
    const [selectedDojoId, setSelectedDojoId] = useState<string>(dojos[0]?.id || '')
    const [name, setName] = useState('')
    const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
    const [dob, setDob] = useState('')
    const [rank, setRank] = useState('white')
    const [weight, setWeight] = useState('')
    const [parentPhone, setParentPhone] = useState('')
    const [parentName, setParentName] = useState('')
    const [schoolOrCity, setSchoolOrCity] = useState('')

    // Tournament fields
    const isSimple = isSimpleEntryEventType(eventType)
    const [participationType, setParticipationType] = useState<'kata' | 'kumite' | 'both'>('both')
    const [eventDayId, setEventDayId] = useState<string>(eventDays[0]?.id || '')

    // State
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [copied, setCopied] = useState(false)
    const [successResult, setSuccessResult] = useState<{
        studentName: string
        categoryName: string
        qrToken: string
        status: string
        phone: string
    } | null>(null)

    // Calculate age preview
    const calculatedAge = useMemo(() => {
        if (!dob) return null
        const birth = new Date(dob)
        if (isNaN(birth.getTime())) return null
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age >= 0 ? age : null
    }, [dob])

    // Real-time computed category
    const computedCategory = useMemo(() => {
        return calculateCategory({
            date_of_birth: dob || null,
            gender: gender,
            rank: rank || null,
            weight: weight ? parseFloat(weight) : null,
        })
    }, [dob, gender, rank, weight])

    const handleSelectRosterStudent = (studentId: string) => {
        setSelectedStudentId(studentId)
        const found = students.find((s) => s.id === studentId)
        if (found) {
            setName(found.name || '')
            setGender(found.gender === 'female' ? 'female' : found.gender === 'other' ? 'other' : 'male')
            setDob(normalizeDobToIso(found.date_of_birth) || '')
            setRank(found.rank || 'white')
            setWeight(found.weight ? String(found.weight) : '')
            setParentPhone(found.phone || '')
            setSelectedDojoId(found.dojo_id || dojos[0]?.id || '')
        }
    }

    const resetForm = () => {
        setName('')
        setGender('male')
        setDob('')
        setRank('white')
        setWeight('')
        setParentPhone('')
        setParentName('')
        setSchoolOrCity('')
        setSelectedStudentId('')
        setSuccessResult(null)
    }

    const handleSubmit = async (submitStatus: 'draft' | 'submitted') => {
        if (mode === 'manual' && !name.trim()) {
            toast.error('Please enter the student’s full name')
            return
        }

        if (mode === 'roster' && !selectedStudentId) {
            toast.error('Please select an athlete from your roster')
            return
        }

        if (!selectedDojoId) {
            toast.error('Please select a dojo')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await coachAddManualStudentAndEntry({
                eventId: event.id,
                dojoId: selectedDojoId,
                existingStudentId: mode === 'roster' ? selectedStudentId : null,
                name: name.trim(),
                gender,
                dateOfBirth: dob || null,
                rank,
                weight: weight ? parseFloat(weight) : null,
                parentPhone: parentPhone.trim() || null,
                parentName: parentName.trim() || null,
                schoolOrCity: schoolOrCity.trim() || null,
                participationType: isSimple ? null : participationType,
                eventDayId: eventDays.length > 0 ? eventDayId : null,
                status: submitStatus,
            })

            if (res.success) {
                toast.success(
                    submitStatus === 'submitted'
                        ? `${res.studentName} registered & submitted to organizer!`
                        : `${res.studentName} saved as draft entry.`
                )
                setSuccessResult({
                    studentName: res.studentName,
                    categoryName: res.categoryName,
                    qrToken: res.qrToken,
                    status: res.status,
                    phone: parentPhone.trim(),
                })
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to add student. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const statusUrl = typeof window !== 'undefined' && successResult?.qrToken
        ? `${window.location.origin}/v/${successResult.qrToken}`
        : ''

    const cleanPhone = (successResult?.phone || '').replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

    const whatsappMessage = encodeURIComponent(
        `Namaste! Your child *${successResult?.studentName}* has been registered for *${event.title}* (${successResult?.categoryName}).\n\nYou can track the tournament entry status & digital pass here:\n${statusUrl}`
    )

    const whatsappShareUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${whatsappMessage}`
        : `https://wa.me/?text=${whatsappMessage}`

    const handleCopyLink = () => {
        if (!statusUrl) return
        navigator.clipboard.writeText(statusUrl)
        setCopied(true)
        toast.success('Parent credential link copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const activeBelt = BELT_CONFIGS[rank] || BELT_CONFIGS.white

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[94vw] sm:max-w-2xl max-h-[92vh] p-0 overflow-hidden border border-border/70 rounded-3xl shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col">
                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-muted/30 via-background to-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                    Athlete Registration
                                </DialogTitle>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    Direct Entry
                                </span>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Enroll an athlete into <strong className="text-foreground">{event.title}</strong>
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    {!successResult && availableRosterStudents.length > 0 && (
                        <div className="flex items-center p-1 bg-muted/60 border border-border/70 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('manual')
                                    setSelectedStudentId('')
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    mode === 'manual'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                New Athlete
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('roster')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    mode === 'roster'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Users className="h-3.5 w-3.5" />
                                Dojo Roster ({availableRosterStudents.length})
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Main Content Area ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {successResult ? (
                        /* ── Success Screen ── */
                        <div className="py-6 max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="h-9 w-9" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black tracking-tight text-foreground">
                                    Registration Complete!
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">{successResult.studentName}</strong> has been enrolled in <strong className="text-foreground">{event.title}</strong>.
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 text-left space-y-2.5 shadow-sm">
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Assigned Division</span>
                                    <span className="font-bold text-foreground">{successResult.categoryName}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                                    <span className="text-muted-foreground">Entry Status</span>
                                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {successResult.status === 'submitted' ? 'Submitted to Organizer' : 'Saved as Draft'}
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Parent Credential & Live Pass Link
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={statusUrl}
                                            className="text-xs font-mono bg-muted/40 h-9 rounded-xl"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyLink}
                                            className="h-9 rounded-xl shrink-0 gap-1.5 font-medium"
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Button */}
                            <div className="space-y-2">
                                <a
                                    href={whatsappShareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <Button className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold gap-2 h-12 rounded-2xl shadow-lg shadow-emerald-500/15 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                                        <Share2 className="h-4 w-4" />
                                        Send Digital Pass via WhatsApp
                                    </Button>
                                </a>
                                <p className="text-[11px] text-muted-foreground">
                                    Parents receive their child's digital credential card & tournament check-in pass.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-11 font-medium"
                                    onClick={resetForm}
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Another Athlete
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl h-11 font-bold"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ── Single-Column Registration Form ── */
                        <div className="space-y-6">
                            {/* Roster Selector (if in roster mode) */}
                            {mode === 'roster' && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-primary uppercase tracking-wider">
                                            Select Athlete from Roster
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Auto-fills athlete profile
                                        </span>
                                    </div>
                                    <Select value={selectedStudentId} onValueChange={handleSelectRosterStudent}>
                                        <SelectTrigger className="h-11 rounded-xl bg-background border-primary/30">
                                            <SelectValue placeholder="Choose athlete..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64">
                                            {availableRosterStudents.map((s) => (
                                                <SelectItem key={s.id} value={s.id} className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground">{s.name}</span>
                                                        <span className="text-xs text-muted-foreground capitalize">
                                                            • {s.gender} • {s.rank || 'White Belt'}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Section 1: Athlete Details */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                            1
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Athlete Profile
                                        </h4>
                                    </div>
                                    {dojos.length > 1 && (
                                        <div className="w-44">
                                            <Select value={selectedDojoId} onValueChange={setSelectedDojoId}>
                                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                                    <SelectValue placeholder="Dojo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {dojos.map((d) => (
                                                        <SelectItem key={d.id} value={d.id}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/80">Full Name *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="e.g. Rahul Sharma"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 h-11 rounded-xl text-sm font-medium focus-visible:ring-primary/30"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* DOB & Gender Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* DOB */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold text-foreground/80">Date of Birth *</Label>
                                            {calculatedAge !== null && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    {calculatedAge} Yrs
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                type="date"
                                                value={dob}
                                                onChange={(e) => setDob(e.target.value)}
                                                className="pl-10 h-11 rounded-xl text-sm font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Gender Segmented Switcher */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Gender *</Label>
                                        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 border border-border/70 rounded-xl h-11">
                                            <button
                                                type="button"
                                                onClick={() => setGender('male')}
                                                className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                                    gender === 'male'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Male
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setGender('female')}
                                                className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                                    gender === 'female'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Female
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setGender('other')}
                                                className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                                    gender === 'other'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Other
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Belt & Weight Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Belt Selector */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Belt / Rank</Label>
                                        <Select value={rank} onValueChange={setRank}>
                                            <SelectTrigger className="h-11 rounded-xl text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-3 w-3 rounded-full border border-black/20"
                                                        style={{ backgroundColor: activeBelt.hex }}
                                                    />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 rounded-xl">
                                                {Object.entries(BELT_CONFIGS).map(([val, conf]) => (
                                                    <SelectItem key={val} value={val} className="py-2 text-xs font-medium">
                                                        <div className="flex items-center gap-2.5">
                                                            <span
                                                                className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                                                                style={{ backgroundColor: conf.hex }}
                                                            />
                                                            <span>{conf.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Weight Input */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Declared Weight (kg)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 55"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                className="h-11 rounded-xl text-sm font-medium pr-10"
                                            />
                                            <span className="absolute right-3.5 top-3 text-xs font-bold text-muted-foreground pointer-events-none">
                                                kg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Tournament Discipline */}
                            <div className="space-y-3 pt-3 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                        2
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Tournament Discipline
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {!isSimple && (
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'both', label: 'Kata & Kumite', icon: Trophy },
                                                    { id: 'kumite', label: 'Kumite (Sparring)', icon: Flame },
                                                    { id: 'kata', label: 'Kata (Forms)', icon: Award },
                                                ].map((t) => {
                                                    const IconComp = t.icon
                                                    const isSelected = participationType === t.id
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setParticipationType(t.id as any)}
                                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                                                                isSelected
                                                                    ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40'
                                                                    : 'border-border/60 bg-card/60 hover:bg-muted/40 text-muted-foreground'
                                                            }`}
                                                        >
                                                            <IconComp className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                                            <span className="text-xs font-bold leading-tight">{t.label}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {eventDays.length > 0 && (
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label className="text-xs font-semibold text-foreground/80">Event Day</Label>
                                            {eventDays.length <= 3 ? (
                                                <div className={`grid gap-2 ${eventDays.length === 1 ? 'grid-cols-1' : eventDays.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                                    {eventDays.map((d, idx) => {
                                                        const formattedDate = formatDateLabel(d.date)
                                                        const isSelected = eventDayId === d.id
                                                        return (
                                                            <button
                                                                key={d.id}
                                                                type="button"
                                                                onClick={() => setEventDayId(d.id)}
                                                                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40'
                                                                        : 'border-border/60 bg-card/60 hover:bg-muted/40 text-muted-foreground'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                        isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                                                    }`}>
                                                                        <Calendar className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="text-xs font-bold leading-tight truncate text-foreground">
                                                                            {d.name || `Day ${idx + 1}`}
                                                                        </div>
                                                                        <div className="text-[11px] text-muted-foreground">
                                                                            {formattedDate}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <Select value={eventDayId} onValueChange={setEventDayId}>
                                                    <SelectTrigger className="h-11 rounded-xl text-sm">
                                                        <SelectValue placeholder="Select day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {eventDays.map((d, idx) => {
                                                            const formattedDate = formatDateLabel(d.date)
                                                            return (
                                                                <SelectItem key={d.id} value={d.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-foreground">{d.name || `Day ${idx + 1}`}</span>
                                                                        <span className="text-xs text-muted-foreground">({formattedDate})</span>
                                                                    </div>
                                                                </SelectItem>
                                                            )
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clean Auto-Computed Division Preview Banner */}
                            <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                                Auto-Computed Division
                                            </span>
                                            <span className="text-[10px] text-muted-foreground capitalize">
                                                • {gender} • {calculatedAge ? `${calculatedAge} yrs` : 'Age pending'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {computedCategory.displayName}
                                        </p>
                                    </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-background/80 border border-border/70 text-[11px] font-medium text-muted-foreground">
                                    <Shield className="h-3.5 w-3.5 text-primary" />
                                    Marshal verified
                                </div>
                            </div>

                            {/* Section 3: Guardian & Contact */}
                            <div className="space-y-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                                            3
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Guardian & WhatsApp Pass
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        Parent receives digital credential link
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">
                                            Parent Phone (WhatsApp)
                                        </Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500" />
                                            <Input
                                                type="tel"
                                                placeholder="+91 98765 43210"
                                                value={parentPhone}
                                                onChange={(e) => setParentPhone(e.target.value)}
                                                className="pl-10 h-11 rounded-xl text-sm font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">
                                            Parent / Guardian Name
                                        </Label>
                                        <Input
                                            placeholder="e.g. Ramesh Sharma"
                                            value={parentName}
                                            onChange={(e) => setParentName(e.target.value)}
                                            className="h-11 rounded-xl text-sm font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label className="text-xs font-semibold text-foreground/80">
                                            School or City (Optional)
                                        </Label>
                                        <Input
                                            placeholder="e.g. St. Joseph's / Bengaluru"
                                            value={schoolOrCity}
                                            onChange={(e) => setSchoolOrCity(e.target.value)}
                                            className="h-11 rounded-xl text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                {!successResult && (
                    <div className="p-4 px-6 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                        <p className="text-[11px] text-muted-foreground hidden sm:block">
                            Athlete will be enrolled into <strong className="text-foreground">{event.title}</strong>
                        </p>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSubmit('draft')}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none h-10 rounded-xl text-xs font-semibold"
                            >
                                Save as Draft
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSubmit('submitted')}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md shadow-primary/20 text-xs sm:text-sm"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Add & Submit Entry
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
