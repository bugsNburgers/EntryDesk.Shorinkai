'use client'

// Roster selector + athlete details — moved verbatim from coach-add-student-dialog.tsx.

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, User } from 'lucide-react'
import { BELT_CONFIGS } from './shared'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentAthleteSection({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { dojos, availableRosterStudents, calculatedAge, handleSelectRosterStudent, activeBelt, mode, selectedStudentId, selectedDojoId, setSelectedDojoId, name, setName, gender, setGender, dob, setDob, rank, setRank, weight, setWeight } = vm
    return (
        <>
                            {/* Roster Selector (if in roster mode) */}
                            {mode === 'roster' && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-primary uppercase tracking-wider">
                                            Select Athlete from Roster
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Auto-fills athlete profile
                                        </span>
                                    </div>
                                    <Select value={selectedStudentId} onValueChange={handleSelectRosterStudent}>
                                        <SelectTrigger className="h-11 rounded-md bg-background border-primary/30">
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
                                                <SelectTrigger className="h-8 text-xs rounded-md">
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
                                            className="pl-10 h-11 rounded-md text-sm font-medium focus-visible:ring-primary/30"
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
                                                className="pl-10 h-11 rounded-md text-sm font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Gender Segmented Switcher */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground/80">Gender *</Label>
                                        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 border border-border/70 rounded-md h-11">
                                            <button
                                                type="button"
                                                onClick={() => setGender('male')}
                                                className={`rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
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
                                                className={`rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
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
                                                className={`rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 ${
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
                                            <SelectTrigger className="h-11 rounded-md text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-3 w-3 rounded-full border border-black/20"
                                                        style={{ backgroundColor: activeBelt.hex }}
                                                    />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 rounded-lg">
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
                                                className="h-11 rounded-md text-sm font-medium pr-10"
                                            />
                                            <span className="absolute right-3.5 top-3 text-xs font-bold text-muted-foreground pointer-events-none">
                                                kg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
        </>
    )
}
