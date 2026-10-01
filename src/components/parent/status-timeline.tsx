import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRight, Ban } from 'lucide-react'
import { getStatusLabel, getStatusBgClass, getStatusDescription } from '@/lib/status'
import { cn } from '@/lib/utils'

export interface StatusTimelineProps {
    status: string
    createdAt: string | Date
    updatedAt?: string | Date | null
    coachNotes?: string | null
    rejectionReason?: string | null
    className?: string
}

export function StatusTimeline({
    status,
    createdAt,
    updatedAt,
    coachNotes,
    rejectionReason,
    className,
}: StatusTimelineProps) {
    const createdDate = new Date(createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })

    const updatedDate = updatedAt
        ? new Date(updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : null

    // Determine status of each step: 'complete' | 'current' | 'upcoming' | 'error' | 'warning'
    let step1State: 'complete' = 'complete'
    let step2State: 'complete' | 'current' | 'upcoming' | 'error' | 'warning' = 'upcoming'
    let step3State: 'complete' | 'current' | 'upcoming' | 'error' = 'upcoming'

    let step2Label = 'Coach Review'
    let step2Desc = 'Coach verifies rank, weight, and eligibility'

    let step3Label = 'Organiser Acceptance'
    let step3Desc = 'Organiser confirms entry and assigns chest number'

    if (status === 'withdrawn') {
        step1State = 'complete'
        step2State = 'error'
        step2Label = 'Entry Withdrawn'
        step2Desc = rejectionReason || 'This entry was withdrawn.'
        step3State = 'upcoming'
    } else if (status === 'pending_coach') {
        step2State = 'current'
        step2Desc = 'Waiting for your coach to review and forward to the organiser'
        step3State = 'upcoming'
    } else if (status === 'correction_needed') {
        step2State = 'warning'
        step2Label = 'Correction Needed'
        step2Desc = coachNotes || 'Coach requested updates to this entry'
        step3State = 'upcoming'
    } else if (status === 'coach_declined') {
        step2State = 'error'
        step2Label = 'Coach Declined'
        step2Desc = coachNotes || rejectionReason || 'Coach decided not to send this entry'
        step3State = 'upcoming'
    } else if (status === 'submitted') {
        step2State = 'complete'
        step2Desc = 'Coach reviewed and forwarded to organiser'
        step3State = 'current'
        step3Desc = 'Waiting for tournament organiser to review and approve'
    } else if (status === 'approved') {
        step2State = 'complete'
        step2Desc = 'Coach verified'
        step3State = 'complete'
        step3Label = 'Accepted'
        step3Desc = 'The athlete is officially registered! ID card is ready'
    } else if (status === 'rejected') {
        step2State = 'complete'
        step2Desc = 'Coach verified'
        step3State = 'error'
        step3Label = 'Not Accepted'
        step3Desc = rejectionReason || 'The organiser did not accept this entry'
    }

    const steps = [
        {
            num: 1,
            title: 'Registration Sent',
            description: 'Entry submitted',
            date: createdDate,
            state: step1State,
        },
        {
            num: 2,
            title: step2Label,
            description: step2Desc,
            date: step2State === 'complete' || step2State === 'warning' || step2State === 'error' ? updatedDate : null,
            state: step2State,
        },
        {
            num: 3,
            title: step3Label,
            description: step3Desc,
            date: step3State === 'complete' || step3State === 'error' ? updatedDate : null,
            state: step3State,
        },
    ]

    return (
        <div className={cn('rounded-2xl border bg-card p-5 sm:p-6 shadow-sm space-y-6', className)}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                    <h3 className="font-semibold text-base">Registration Progress</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track your registration as it moves through coach review and organiser acceptance
                    </p>
                </div>
                <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold', getStatusBgClass(status))}>
                    {getStatusLabel(status)}
                </span>
            </div>

            {/* Stepper Timeline */}
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                {steps.map((step, idx) => {
                    return (
                        <div key={idx} className="relative flex items-start gap-4">
                            {/* Step Icon */}
                            <div
                                className={cn(
                                    'absolute -left-6 sm:-left-8 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors bg-background',
                                    step.state === 'complete' && 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
                                    step.state === 'current' && 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 ring-4 ring-blue-500/10',
                                    step.state === 'warning' && 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 ring-4 ring-amber-500/10',
                                    step.state === 'error' && 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 ring-4 ring-rose-500/10',
                                    step.state === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
                                )}
                            >
                                {step.state === 'complete' && <CheckCircle2 className="h-4 w-4" />}
                                {step.state === 'current' && <Clock className="h-4 w-4 animate-pulse" />}
                                {step.state === 'warning' && <AlertTriangle className="h-4 w-4" />}
                                {step.state === 'error' && <XCircle className="h-4 w-4" />}
                                {step.state === 'upcoming' && <span>{step.num}</span>}
                            </div>

                            {/* Content */}
                            <div className="space-y-1 pt-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                        className={cn(
                                            'text-sm font-semibold',
                                            step.state === 'complete' && 'text-foreground',
                                            step.state === 'current' && 'text-blue-700 dark:text-blue-400',
                                            step.state === 'warning' && 'text-amber-700 dark:text-amber-400',
                                            step.state === 'error' && 'text-rose-700 dark:text-rose-400',
                                            step.state === 'upcoming' && 'text-muted-foreground'
                                        )}
                                    >
                                        {step.title}
                                    </h4>
                                    {step.date && (
                                        <span className="text-[11px] text-muted-foreground">({step.date})</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Explanatory banner */}
            <div className="rounded-xl bg-muted/40 p-4 border border-border/60 text-xs">
                <span className="font-semibold text-foreground">Current Status: </span>
                <span className="text-muted-foreground">{getStatusDescription(status)}</span>
            </div>
        </div>
    )
}
