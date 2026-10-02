'use client'

// ============================================================================
// EntryDesk — Date of Birth (DOB) Picker Component
// Features quick Year & Month jump dropdowns, age calculation,
// calendar grid selection, and manual date input for seamless UX.
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DobPickerProps {
    name?: string
    id?: string
    defaultValue?: string // YYYY-MM-DD
    required?: boolean
    minYear?: number
    maxYear?: number
    onChange?: (dateString: string) => void
    className?: string
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
    return new Date(year, month, 1).getDay()
}

function calculateAge(birthDate: Date): number {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

export function DobPicker({
    name = 'date_of_birth',
    id = 'date_of_birth',
    defaultValue = '',
    required = false,
    minYear = 1940,
    maxYear = new Date().getFullYear(),
    onChange,
    className,
}: DobPickerProps) {
    const currentYear = new Date().getFullYear()

    // Parse initial default value if provided (YYYY-MM-DD)
    const initialDate = defaultValue && /^\d{4}-\d{2}-\d{2}$/.test(defaultValue)
        ? new Date(defaultValue + 'T00:00:00')
        : null

    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate)
    const [viewYear, setViewYear] = useState<number>(initialDate ? initialDate.getFullYear() : currentYear - 12)
    const [viewMonth, setViewMonth] = useState<number>(initialDate ? initialDate.getMonth() : 0)
    const [isOpen, setIsOpen] = useState(false)

    // Years list (most recent first down to minYear)
    const years: number[] = []
    for (let y = maxYear; y >= minYear; y--) {
        years.push(y)
    }

    // Days in current view
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

    // Format for display: e.g. "14 May 2012"
    const displayValue = selectedDate
        ? `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
        : ''

    // Format for hidden form input: "YYYY-MM-DD"
    const isoValue = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : ''

    const calculatedAge = selectedDate ? calculateAge(selectedDate) : null

    const handleSelectDay = (day: number) => {
        const newDate = new Date(viewYear, viewMonth, day)
        setSelectedDate(newDate)
        const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        if (onChange) onChange(formatted)
        setIsOpen(false)
    }

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11)
            setViewYear((y) => Math.max(minYear, y - 1))
        } else {
            setViewMonth((m) => m - 1)
        }
    }

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            if (viewYear < maxYear) {
                setViewMonth(0)
                setViewYear((y) => y + 1)
            }
        } else {
            setViewMonth((m) => m + 1)
        }
    }

    return (
        <div className={cn('relative w-full space-y-1', className)}>
            {/* Hidden Input for Form Submissions */}
            <input
                type="hidden"
                id={id}
                name={name}
                value={isoValue}
                required={required}
            />

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        id={`${id}-trigger`}
                        className={cn(
                            'flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3.5 py-2 text-sm ring-offset-background transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            !selectedDate && 'text-muted-foreground'
                        )}
                    >
                        <div className="flex items-center gap-2.5 truncate">
                            <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                            {selectedDate ? (
                                <span className="font-medium text-foreground tracking-tight">
                                    {displayValue}
                                </span>
                            ) : (
                                <span className="text-muted-foreground/80">
                                    Select date of birth (Day, Month, Year)
                                </span>
                            )}
                        </div>

                        {calculatedAge !== null && (
                            <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {calculatedAge} {calculatedAge === 1 ? 'yr' : 'yrs'} old
                            </span>
                        )}
                    </button>
                </PopoverTrigger>

                <PopoverContent className="w-[320px] p-4 rounded-lg shadow-xl border border-border/80 bg-card" align="start">
                    {/* Month & Year Selectors Header */}
                    <div className="space-y-3 pb-3 border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            {/* Month Select */}
                            <select
                                value={viewMonth}
                                onChange={(e) => setViewMonth(Number(e.target.value))}
                                className="h-9 flex-1 rounded-md border border-input bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            >
                                {MONTHS.map((m, idx) => (
                                    <SelectItemOption key={m} value={idx}>
                                        {m}
                                    </SelectItemOption>
                                ))}
                            </select>

                            {/* Year Select */}
                            <select
                                value={viewYear}
                                onChange={(e) => setViewYear(Number(e.target.value))}
                                className="h-9 w-24 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            >
                                {years.map((y) => (
                                    <SelectItemOption key={y} value={y}>
                                        {y}
                                    </SelectItemOption>
                                ))}
                            </select>

                            {/* Nav Buttons */}
                            <div className="flex items-center gap-0.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePrevMonth}
                                    className="h-8 w-8 rounded-md hover:bg-muted"
                                    title="Previous Month"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleNextMonth}
                                    className="h-8 w-8 rounded-md hover:bg-muted"
                                    title="Next Month"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
                        {DAYS_OF_WEEK.map((day) => (
                            <span key={day} className="text-[11px] font-semibold text-muted-foreground/70">
                                {day}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty padding cells for first week */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8 w-8" />
                        ))}

                        {/* Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const isSelected =
                                selectedDate &&
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === viewMonth &&
                                selectedDate.getFullYear() === viewYear

                            const isToday =
                                new Date().getDate() === day &&
                                new Date().getMonth() === viewMonth &&
                                new Date().getFullYear() === viewYear

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={cn(
                                        'h-8 w-8 rounded-md text-xs font-medium transition-all flex items-center justify-center cursor-pointer',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                            : 'hover:bg-muted/70 text-foreground',
                                        isToday && !isSelected && 'border border-primary/40 text-primary font-semibold'
                                    )}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>

                    {/* Footer Age Indicator & Clear */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                        {calculatedAge !== null ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Age: {calculatedAge} years
                            </span>
                        ) : (
                            <span className="text-[11px] text-muted-foreground">Pick a day</span>
                        )}

                        {selectedDate && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(null)
                                    if (onChange) onChange('')
                                }}
                                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

function SelectItemOption({ value, children }: { value: number | string; children: React.ReactNode }) {
    return (
        <option value={value} className="bg-popover text-popover-foreground py-1">
            {children}
        </option>
    )
}
