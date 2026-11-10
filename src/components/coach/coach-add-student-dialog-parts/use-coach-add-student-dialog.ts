'use client'

// State, derived data and handlers of CoachAddStudentDialog (moved verbatim from the component body).

import { useState, useMemo } from 'react'
import { ageReferenceDate, calculateCategory } from '@/lib/category'
import { coachAddManualStudentAndEntry } from '@/app/dashboard/entries/actions'
import { toast } from 'sonner'
import { isSimpleEntryEventType } from '@/lib/events/type'
import { normalizeDobToIso } from '@/lib/date'
import { BELT_CONFIGS, CoachAddStudentDialogProps } from './shared'

export function useCoachAddStudentDialog({
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
        }, { referenceDate: ageReferenceDate(event.start_date, event.age_cutoff_rule) })
    }, [dob, gender, rank, weight, event.start_date, event.age_cutoff_rule])

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

    const handleSubmit = async () => {
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
            })

            if (res.success) {
                toast.success(`${res.studentName} saved. Mark the entry as paid before sending it.`)
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

    return {
        open,
        onOpenChange,
        event,
        eventType,
        eventDays,
        dojos,
        students,
        existingStudentIds,
        availableRosterStudents,
        isSimple,
        calculatedAge,
        computedCategory,
        handleSelectRosterStudent,
        resetForm,
        handleSubmit,
        statusUrl,
        cleanPhone,
        formattedPhone,
        whatsappMessage,
        whatsappShareUrl,
        handleCopyLink,
        activeBelt,
        mode,
        setMode,
        selectedStudentId,
        setSelectedStudentId,
        selectedDojoId,
        setSelectedDojoId,
        name,
        setName,
        gender,
        setGender,
        dob,
        setDob,
        rank,
        setRank,
        weight,
        setWeight,
        parentPhone,
        setParentPhone,
        parentName,
        setParentName,
        schoolOrCity,
        setSchoolOrCity,
        participationType,
        setParticipationType,
        eventDayId,
        setEventDayId,
        isSubmitting,
        setIsSubmitting,
        copied,
        setCopied,
        successResult,
        setSuccessResult,
    }
}

export type CoachAddStudentDialogVM = ReturnType<typeof useCoachAddStudentDialog>
