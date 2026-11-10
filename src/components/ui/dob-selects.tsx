'use client'

// Date of birth as three plain dropdowns (Day / Month / Year) — easier than a calendar for people who
// are not used to apps. Submits a hidden YYYY-MM-DD value under `name`. Shows "DD/MM/YYYY · N years old".

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

function ageOn(y: number, m: number, d: number, today = new Date()) {
    let age = today.getFullYear() - y
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
    return age
}

export function DobSelects({
    id = 'date_of_birth',
    name = 'date_of_birth',
    defaultValue = '',
    required = false,
    minYear = 1940,
    onChange,
    className,
}: {
    id?: string
    name?: string
    defaultValue?: string
    required?: boolean
    minYear?: number
    onChange?: (iso: string) => void
    className?: string
}) {
    const [y0, m0, d0] = /^\d{4}-\d{2}-\d{2}$/.test(defaultValue) ? defaultValue.split('-').map(Number) : [0, 0, 0]
    const [day, setDay] = useState(d0 || 0)
    const [month, setMonth] = useState(m0 || 0)
    const [year, setYear] = useState(y0 || 0)
    const thisYear = new Date().getFullYear()
    const years = useMemo(() => Array.from({ length: thisYear - minYear + 1 }, (_, i) => thisYear - i), [thisYear, minYear])
    const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31
    const validDay = day && day <= daysInMonth ? day : 0
    const iso = validDay && month && year ? `${year}-${pad(month)}-${pad(validDay)}` : ''

    const update = (d: number, m: number, y: number) => {
        const dim = y && m ? new Date(y, m, 0).getDate() : 31
        const dd = d && d <= dim ? d : 0
        onChange?.(dd && m && y ? `${y}-${pad(m)}-${pad(dd)}` : '')
    }

    const selectCls =
        'h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

    return (
        <div className={cn('space-y-1.5', className)}>
            <input type="hidden" name={name} value={iso} required={required} />
            <div className="grid grid-cols-[1fr_1.3fr_1.3fr] gap-2">
                <label className="sr-only" htmlFor={`${id}-day`}>Day</label>
                <select
                    id={`${id}-day`}
                    className={selectCls}
                    value={day || ''}
                    onChange={(e) => {
                        const v = Number(e.target.value)
                        setDay(v)
                        update(v, month, year)
                    }}
                >
                    <option value="">Day</option>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{pad(d)}</option>
                    ))}
                </select>
                <label className="sr-only" htmlFor={`${id}-month`}>Month</label>
                <select
                    id={`${id}-month`}
                    className={selectCls}
                    value={month || ''}
                    onChange={(e) => {
                        const v = Number(e.target.value)
                        setMonth(v)
                        update(day, v, year)
                    }}
                >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{`${pad(i + 1)} ${m}`}</option>
                    ))}
                </select>
                <label className="sr-only" htmlFor={id}>Year</label>
                <select
                    id={id}
                    className={selectCls}
                    value={year || ''}
                    onChange={(e) => {
                        const v = Number(e.target.value)
                        setYear(v)
                        update(day, month, v)
                    }}
                >
                    <option value="">Year</option>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
            {iso && (
                <p className="text-[15px] text-muted-foreground">
                    {`${pad(validDay)}/${pad(month)}/${year}`} · {ageOn(year, month, validDay)} years old
                </p>
            )}
        </div>
    )
}
