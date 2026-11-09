'use client'

// Coach/organiser correction of the athlete details an entry was submitted with
// (entries.snap_*). The athlete profile itself is not changed.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PencilLine, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { correctEntrySnapshot } from '@/app/dashboard/entries/snapshot-actions'

export interface EntrySnapshotValues {
    name: string
    gender: string | null
    date_of_birth: string | null
    rank: string | null
    weight: number | string | null
    school_or_city: string | null
}

function isoDate(v: string | null): string {
    if (!v) return ''
    const m = String(v).match(/^\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : ''
}

export function EntrySnapshotDialog({
    entryId,
    initial,
    triggerLabel = 'Edit entry details',
}: {
    entryId: string
    initial: EntrySnapshotValues
    triggerLabel?: string
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState(() => ({
        name: initial.name ?? '',
        gender: (initial.gender ?? 'male') as 'male' | 'female' | 'other',
        date_of_birth: isoDate(initial.date_of_birth),
        rank: initial.rank ?? '',
        weight: initial.weight == null ? '' : String(initial.weight),
        school_or_city: initial.school_or_city ?? '',
    }))

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }))

    const save = () => {
        setError(null)
        startTransition(async () => {
            const weight = form.weight.trim() === '' ? null : Number(form.weight)
            const res = await correctEntrySnapshot(entryId, {
                name: form.name,
                gender: form.gender,
                date_of_birth: form.date_of_birth,
                rank: form.rank || null,
                weight_kg: weight,
                school_or_city: form.school_or_city || null,
            })
            if (res.error) {
                setError(res.error)
                return
            }
            setOpen(false)
            router.refresh()
        })
    }

    return (
        <>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title={triggerLabel}
                aria-label={triggerLabel}
                onClick={() => setOpen(true)}
            >
                <PencilLine className="h-4 w-4" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Correct entry details</DialogTitle>
                        <DialogDescription>
                            Fixes the details this entry was submitted with. The athlete&apos;s profile is not changed. The change is logged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor={`snap-name-${entryId}`}>Name</Label>
                            <Input id={`snap-name-${entryId}`} value={form.name} onChange={set('name')} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor={`snap-gender-${entryId}`}>Gender</Label>
                                <select
                                    id={`snap-gender-${entryId}`}
                                    value={form.gender}
                                    onChange={set('gender')}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`snap-dob-${entryId}`}>Date of birth</Label>
                                <Input id={`snap-dob-${entryId}`} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor={`snap-rank-${entryId}`}>Belt / rank</Label>
                                <Input id={`snap-rank-${entryId}`} value={form.rank} onChange={set('rank')} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`snap-weight-${entryId}`}>Weight (kg)</Label>
                                <Input id={`snap-weight-${entryId}`} inputMode="decimal" value={form.weight} onChange={set('weight')} />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor={`snap-school-${entryId}`}>School / city</Label>
                            <Input id={`snap-school-${entryId}`} value={form.school_or_city} onChange={set('school_or_city')} />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
