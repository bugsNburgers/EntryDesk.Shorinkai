'use client'

// ============================================================================
// EntryDesk — Edit Athlete Dialog (Parent Portal)
// Matches the Portal.dc.html design with sleek dark theme and #2dd4b4 accents.
// ============================================================================

import React, { useState, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateChildAsParent } from '@/app/parent/actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export interface EditableStudent {
    id: string
    name: string
    gender: string
    rank: string | null
    weight: number | null
    date_of_birth: string | null
    school_or_city: string | null
    phone: string | null
    city?: string | null
}

interface EditAthleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student: EditableStudent
    initialSection?: 'basic' | 'personal' | 'contact' | 'all'
}

export function EditAthleteDialog({
    open,
    onOpenChange,
    student,
    initialSection = 'basic',
}: EditAthleteDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState(student.name)
    const [gender, setGender] = useState(student.gender || 'male')
    const [rank, setRank] = useState(student.rank || '')
    const [weight, setWeight] = useState(student.weight ? String(student.weight) : '')
    const [dob, setDob] = useState(
        student.date_of_birth
            ? String(student.date_of_birth).slice(0, 10)
            : ''
    )
    const [schoolOrCity, setSchoolOrCity] = useState(student.school_or_city || '')
    const [phone, setPhone] = useState(student.phone || '')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Sync values when student changes or modal opens
    React.useEffect(() => {
        setName(student.name)
        setGender(student.gender || 'male')
        setRank(student.rank || '')
        setWeight(student.weight ? String(student.weight) : '')
        setDob(student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '')
        setSchoolOrCity(student.school_or_city || '')
        setPhone(student.phone || '')
        setErrorMessage(null)
    }, [student, open])

    const sectionConfig = {
        basic: {
            title: 'Edit Profile',
            description: "Update athlete's name and gender.",
            submitLabel: 'Save Profile',
            successToast: 'Profile updated successfully',
        },
        personal: {
            title: 'Edit Personal Details',
            description: 'Update belt/rank, weight, date of birth, and city/school.',
            submitLabel: 'Save Personal Details',
            successToast: 'Personal details updated successfully',
        },
        contact: {
            title: 'Edit Contact Details',
            description: 'Update contact phone number.',
            submitLabel: 'Save Contact Details',
            successToast: 'Contact details updated successfully',
        },
        all: {
            title: 'Edit Athlete Profile',
            description: 'Update profile, personal details, or contact information.',
            submitLabel: 'Save Changes',
            successToast: 'Athlete details updated successfully',
        },
    }

    const currentConfig = sectionConfig[initialSection] || sectionConfig.all
    const showBasic = initialSection === 'basic' || initialSection === 'all'
    const showPersonal = initialSection === 'personal' || initialSection === 'all'
    const showContact = initialSection === 'contact' || initialSection === 'all'

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrorMessage(null)

        const formData = new FormData()
        formData.append('section', initialSection)

        if (showBasic) {
            formData.append('name', name)
            formData.append('gender', gender)
        }
        if (showPersonal) {
            formData.append('rank', rank)
            formData.append('weight', weight)
            formData.append('date_of_birth', dob)
            formData.append('school_or_city', schoolOrCity)
        }
        if (showContact) {
            formData.append('phone', phone)
        }

        startTransition(async () => {
            try {
                const res = await updateChildAsParent(student.id, formData)
                if (res?.error) {
                    setErrorMessage(res.error)
                    toast.error(res.error)
                } else {
                    toast.success(currentConfig.successToast)
                    onOpenChange(false)
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to update details'
                setErrorMessage(msg)
                toast.error(msg)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white border-[#ded8cb] text-[#1c1917] dark:bg-[#111a2b] dark:border-[#1f2b40] dark:text-[#e8eef5] p-6 rounded-2xl shadow-2xl">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-xl font-bold text-[#1c1917] dark:text-[#e8eef5]">
                        {currentConfig.title}
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-[#57534e] dark:text-[#8a99ab]">
                        {currentConfig.description}
                    </DialogDescription>
                </DialogHeader>

                {errorMessage && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* SECTION 1: Basic / Profile (Name & Gender) */}
                    {showBasic && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                    Full Name <span className="text-rose-500 dark:text-rose-400">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                    Gender
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['male', 'female'] as const).map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGender(g)}
                                            className={`h-10 rounded-md text-xs font-bold capitalize transition-all border ${
                                                gender === g
                                                    ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-[#2dd4b4] dark:text-[#04231e] dark:border-[#2dd4b4]'
                                                    : 'bg-white text-[#57534e] border-[#ded8cb] hover:text-[#1c1917] dark:bg-[#0d1626] dark:text-[#8a99ab] dark:border-[#1f2b40] dark:hover:text-[#e8eef5]'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* SECTION 2: Personal Details (Belt, Weight, DOB, City/School) */}
                    {showPersonal && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-rank" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                        Belt / Rank
                                    </Label>
                                    <Input
                                        id="edit-rank"
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        placeholder="e.g. Yellow Belt"
                                        className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-weight" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                        Weight (kg)
                                    </Label>
                                    <Input
                                        id="edit-weight"
                                        type="number"
                                        step="0.1"
                                        min="5"
                                        max="200"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="e.g. 44"
                                        className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-dob" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                    Date of Birth
                                </Label>
                                <Input
                                    id="edit-dob"
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-school" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                    City / School
                                </Label>
                                <Input
                                    id="edit-school"
                                    value={schoolOrCity}
                                    onChange={(e) => setSchoolOrCity(e.target.value)}
                                    placeholder="e.g. Pune · St. Mary's School"
                                    className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10 text-xs"
                                />
                            </div>
                        </>
                    )}

                    {/* SECTION 3: Contact (Phone) */}
                    {showContact && (
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone" className="text-xs font-semibold text-[#57534e] dark:text-[#8a99ab] uppercase tracking-wider">
                                Phone Number
                            </Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91 00000 00000"
                                className="bg-white border-[#ded8cb] text-[#1c1917] focus:border-emerald-600 focus:ring-emerald-500/20 dark:bg-[#0d1626] dark:border-[#1f2b40] dark:text-[#e8eef5] dark:focus:border-[#2dd4b4] dark:focus:ring-[#2dd4b4]/20 rounded-md h-10 text-xs"
                            />
                            <p className="text-[11.5px] text-[#57534e] dark:text-[#8a99ab] pt-0.5">
                                Used by tournament organizers and coaches for entry updates and verification.
                            </p>
                        </div>
                    )}

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ded8cb] dark:border-[#1f2b40]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="rounded-md text-[#57534e] hover:text-[#1c1917] hover:bg-[#ded8cb]/40 dark:text-[#8a99ab] dark:hover:text-[#e8eef5] dark:hover:bg-[#16233a]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#2dd4b4] dark:text-[#04231e] dark:hover:bg-[#25c4a5] font-bold px-5"
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {currentConfig.submitLabel}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function EditAthleteTrigger({
    student,
    target = 'basic',
    className = '',
}: {
    student: EditableStudent
    target?: 'basic' | 'personal' | 'contact' | 'all'
    className?: string
}) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 dark:text-[#2dd4b4] border border-[#ded8cb] dark:border-[#2a3b57] hover:border-emerald-600 dark:hover:border-[#2dd4b4] hover:bg-emerald-500/10 dark:hover:bg-[#2dd4b4]/10 rounded-md px-3 py-1.5 transition-all shrink-0 active:scale-95 ${className}`}
                title="Edit details"
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M2 12l1-3.5L10 1.5l2.5 2.5-7 7z" />
                </svg>
                <span>Edit</span>
            </button>

            <EditAthleteDialog
                open={open}
                onOpenChange={setOpen}
                student={student}
                initialSection={target}
            />
        </>
    )
}
