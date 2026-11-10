'use client'

// Tournament discipline + division preview — moved verbatim from coach-add-student-dialog.tsx.

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Shield, Calendar, Award, Trophy, Flame } from 'lucide-react'
import { formatDateLabel } from './shared'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentDisciplineSection({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { eventDays, isSimple, calculatedAge, computedCategory, gender, participationType, setParticipationType, eventDayId, setEventDayId } = vm
    return (
        <>
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
                                                            className={`p-3 rounded-md border text-left transition-all flex flex-col gap-1.5 ${
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
                                                                className={`p-3 rounded-md border text-left transition-all flex items-center justify-between gap-2 ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40'
                                                                        : 'border-border/60 bg-card/60 hover:bg-muted/40 text-muted-foreground'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
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
                                                    <SelectTrigger className="h-11 rounded-md text-sm">
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
        </>
    )
}
