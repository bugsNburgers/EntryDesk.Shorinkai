'use client'

// Guardian and contact — moved verbatim from coach-add-student-dialog.tsx.

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone } from 'lucide-react'
import type { CoachAddStudentDialogVM } from './use-coach-add-student-dialog'

export function AddStudentGuardianSection({ vm }: { vm: CoachAddStudentDialogVM }) {
    const { parentPhone, setParentPhone, parentName, setParentName, schoolOrCity, setSchoolOrCity } = vm
    return (
        <>
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
                                                className="pl-10 h-11 rounded-md text-sm font-medium"
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
                                            className="h-11 rounded-md text-sm font-medium"
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
                                            className="h-11 rounded-md text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
        </>
    )
}
