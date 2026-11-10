'use client'

// Belt colour picker: tap a colour instead of typing ("yelow", "5 kyu", "Y" …).
// Submits the colour name (e.g. "Yellow") under `name`, which is what `students.rank` stores.
// The swatch colours are the physical belt colours, not theme colours, so they are fixed on purpose.

import { useState } from 'react'
import { cn } from '@/lib/utils'

export const BELTS: Array<{ value: string; swatch: string }> = [
    { value: 'White', swatch: '#ffffff' },
    { value: 'Yellow', swatch: '#f2c418' },
    { value: 'Orange', swatch: '#ee7d1a' },
    { value: 'Green', swatch: '#2f8f3a' },
    { value: 'Blue', swatch: '#2161c4' },
    { value: 'Purple', swatch: '#7b3fb5' },
    { value: 'Brown', swatch: '#7a4a1f' },
    { value: 'Black', swatch: '#111111' },
]

/** Maps free text already in the DB ("yellow belt", "Green") to a picker value, if it matches one. */
export function beltFromText(rank: string | null | undefined): string {
    if (!rank) return ''
    const r = rank.toLowerCase()
    return BELTS.find((b) => r.includes(b.value.toLowerCase()))?.value ?? ''
}

export function BeltPicker({
    name = 'rank',
    defaultValue = '',
    required = false,
    onChange,
}: {
    name?: string
    defaultValue?: string
    required?: boolean
    onChange?: (value: string) => void
}) {
    const [value, setValue] = useState(beltFromText(defaultValue))
    return (
        <div role="radiogroup" aria-label="Belt colour" className="grid grid-cols-4 gap-2">
            {BELTS.map((b, i) => {
                const on = value === b.value
                return (
                    <label
                        key={b.value}
                        className={cn(
                            'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-2 text-sm font-semibold transition-colors',
                            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                            on ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-foreground/30',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={b.value}
                            checked={on}
                            required={required && i === 0}
                            onChange={() => {
                                setValue(b.value)
                                onChange?.(b.value)
                            }}
                            className="sr-only"
                        />
                        <span
                            aria-hidden="true"
                            className="block h-2.5 w-9 rounded-[3px] border border-black/20"
                            style={{ background: b.swatch }}
                        />
                        {b.value}
                    </label>
                )
            })}
        </div>
    )
}
