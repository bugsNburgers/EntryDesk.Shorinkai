'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2, CheckSquare, Clock, ClipboardList, Download, LayoutGrid, Plus, Users } from 'lucide-react'

export function LandingUiPreview() {
    const [activeView, setActiveView] = useState<'coach' | 'organizer'>('coach')
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const activeViewRef = useRef<'coach' | 'organizer'>('coach')
    const programmaticScrollRef = useRef(false)
    const programmaticClearTimerRef = useRef<number | null>(null)

    useEffect(() => {
        activeViewRef.current = activeView
    }, [activeView])

    const scrollToView = (view: 'coach' | 'organizer', source: 'manual' | 'auto' = 'manual') => {
        const viewport = viewportRef.current
        if (!viewport) return

        if (source === 'auto') {
            programmaticScrollRef.current = true
            if (programmaticClearTimerRef.current) {
                window.clearTimeout(programmaticClearTimerRef.current)
            }
            programmaticClearTimerRef.current = window.setTimeout(() => {
                programmaticScrollRef.current = false
                programmaticClearTimerRef.current = null
            }, 700)
        }

        const left = view === 'coach' ? 0 : viewport.clientWidth
        viewport.scrollTo({ left, behavior: 'smooth' })
        setActiveView(view)
    }

    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        let autoTimer: number | null = null
        let isInView = false

        const clearAutoTimer = () => {
            if (autoTimer) {
                window.clearTimeout(autoTimer)
                autoTimer = null
            }
        }

        const scheduleAutoSwitch = (delayMs: number) => {
            clearAutoTimer()
            if (!isInView) return

            autoTimer = window.setTimeout(() => {
                const maxScroll = viewport.scrollWidth - viewport.clientWidth
                if (maxScroll <= 8) return

                const next = activeViewRef.current === 'coach' ? 'organizer' : 'coach'
                scrollToView(next, 'auto')
                scheduleAutoSwitch(3500)
            }, delayMs)
        }

        const syncActiveTab = () => {
            const midpoint = viewport.clientWidth / 2
            setActiveView(viewport.scrollLeft > midpoint ? 'organizer' : 'coach')
            if (!programmaticScrollRef.current) {
                scheduleAutoSwitch(4500)
            }
        }

        const handleManualInteraction = () => {
            if (programmaticScrollRef.current) return
            scheduleAutoSwitch(4500)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                if (!entry?.isIntersecting) {
                    isInView = false
                    clearAutoTimer()
                    return
                }

                isInView = true
                const maxScroll = viewport.scrollWidth - viewport.clientWidth
                if (maxScroll <= 8) return

                scheduleAutoSwitch(3500)
            },
            { threshold: 0.3 }
        )

        observer.observe(viewport)
        viewport.addEventListener('scroll', syncActiveTab, { passive: true })
        viewport.addEventListener('wheel', handleManualInteraction, { passive: true })
        viewport.addEventListener('touchstart', handleManualInteraction, { passive: true })
        viewport.addEventListener('pointerdown', handleManualInteraction, { passive: true })

        return () => {
            observer.disconnect()
            viewport.removeEventListener('scroll', syncActiveTab)
            viewport.removeEventListener('wheel', handleManualInteraction)
            viewport.removeEventListener('touchstart', handleManualInteraction)
            viewport.removeEventListener('pointerdown', handleManualInteraction)
            clearAutoTimer()
            if (programmaticClearTimerRef.current) {
                window.clearTimeout(programmaticClearTimerRef.current)
                programmaticClearTimerRef.current = null
            }
        }
    }, [])

    return (
        <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 md:px-8 xl:max-w-[95vw] xl:px-8">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1 text-xs font-medium text-muted-foreground mb-4">
                    Dashboard preview
                </div>
                <h2 className="text-4xl font-bold tracking-tight">Built for every role in your tournament</h2>
                <p className="mx-auto mt-3 max-w-4xl text-center text-xl text-muted-foreground">
                    Whether you&apos;re a coach managing athletes or an organizer running the event — EntryDesk has a workflow built for you.
                </p>
            </div>

            {/* Tab pills — clearly interactive */}
            <div className="mt-8 flex items-center justify-center">
                <div className="flex rounded-xl border border-border/50 bg-muted/30 p-1 gap-1">
                    <button
                        onClick={() => scrollToView('coach')}
                        className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                            activeView === 'coach'
                                ? 'bg-background text-foreground shadow-sm border border-border/40 dark:bg-white/[0.08]'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Coach View
                    </button>
                    <button
                        onClick={() => scrollToView('organizer')}
                        className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                            activeView === 'organizer'
                                ? 'bg-background text-foreground shadow-sm border border-border/40 dark:bg-white/[0.08]'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Organizer View
                    </button>
                </div>
            </div>

            <div
                ref={viewportRef}
                className="mt-8 overflow-x-auto rounded-3xl border border-border/50 bg-card scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 dark:border-white/[0.10]"
            >
                <div className="flex min-w-full">
                    <div className="w-full shrink-0 snap-start">
                        <CoachPreview />
                    </div>
                    <div className="w-full shrink-0 snap-start">
                        <OrganizerPreview />
                    </div>
                </div>
            </div>

            <div className="mt-3 flex justify-center">
                <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1.5 dark:border-white/[0.12] dark:bg-white/[0.04]">
                    <button
                        type="button"
                        aria-label="Show coach preview"
                        onClick={() => scrollToView('coach')}
                        className={`h-1.5 rounded-full transition-all ${activeView === 'coach' ? 'w-6 bg-primary' : 'w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
                    />
                    <button
                        type="button"
                        aria-label="Show organizer preview"
                        onClick={() => scrollToView('organizer')}
                        className={`h-1.5 rounded-full transition-all ${activeView === 'organizer' ? 'w-6 bg-primary' : 'w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
                    />
                </div>
            </div>
        </section>
    )
}

function CoachPreview() {
    const entryRows = [
        { athlete: 'Aarav Patil', event: 'Kata', status: 'Approved' },
        { athlete: 'Riya Nair', event: 'Kumite', status: 'Submitted' },
        { athlete: 'Vihaan Rao', event: 'Kata Team', status: 'Draft' },
    ]

    return (
        <div className="flex h-full flex-col p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold">Coach dashboard</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Manage dojos, students, and entries for upcoming events.</p>
                </div>
                <Button size="sm" className="h-11 rounded-md px-5 gap-2">
                    <Plus className="h-4 w-4" />
                    Register athletes
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric icon={<LayoutGrid className="h-4 w-4" />} label="Dojos" value="4" />
                <MiniMetric icon={<Users className="h-4 w-4" />} label="Students" value="52" />
                <MiniMetric icon={<ClipboardList className="h-4 w-4" />} label="Entries" value="31" />
            </div>

            <div className="mt-4 flex-1 rounded-2xl border border-border/50 dark:border-white/[0.10]">
                <div className="border-b border-border/50 px-5 py-3 text-sm font-medium dark:border-white/[0.10]">Recent entries</div>
                <div className="divide-y divide-border/50 dark:divide-white/[0.10]">
                    {entryRows.map((entry) => (
                        <div key={entry.athlete} className="flex items-center justify-between px-5 py-3 text-sm">
                            <div>
                                <div className="font-medium">{entry.athlete}</div>
                                <div className="text-muted-foreground">{entry.event}</div>
                            </div>
                            <Badge variant={entry.status === 'Approved' ? 'default' : 'secondary'}>{entry.status}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function OrganizerPreview() {
    const approvalRows = [
        { dojo: 'Shinobi Dojo', student: 'Aarav Patil', category: 'Junior Kata' },
        { dojo: 'Zen Academy', student: 'Riya Nair', category: 'Senior Kumite' },
        { dojo: 'Tiger Martial Arts', student: 'Vihaan Rao', category: 'Team Kata' },
    ]

    return (
        <div className="flex h-full flex-col p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold">Organizer dashboard</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Review approvals, manage events, and export finalized entries.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-11 rounded-md px-5 gap-2 border-border/50 bg-muted/25 dark:border-white/[0.12] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button size="sm" className="h-11 rounded-md px-5 gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Approve queue
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric icon={<Calendar className="h-4 w-4" />} label="Events" value="6" />
                <MiniMetric icon={<Clock className="h-4 w-4" />} label="Pending" value="14" />
                <MiniMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value="128" />
            </div>

            <div className="mt-4 flex-1 overflow-x-auto rounded-2xl border border-border/50 dark:border-white/[0.10]">
                <table className="h-full w-full text-left text-sm">
                    <thead className="border-b border-border/50 text-muted-foreground dark:border-white/[0.10]">
                        <tr>
                            <th className="px-4 py-2 font-medium">Student</th>
                            <th className="px-4 py-2 font-medium">Category</th>
                            <th className="px-4 py-2 font-medium">Dojo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvalRows.map((row) => (
                            <tr key={`${row.dojo}-${row.student}`} className="border-b border-border/50 last:border-b-0 dark:border-white/[0.10]">
                                <td className="px-4 py-2.5 font-medium">{row.student}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{row.category}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{row.dojo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border/50 bg-background/70 p-4 dark:border-white/[0.10]">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-primary">{icon}</span>
                <span>{label}</span>
            </div>
            <div className="text-4xl font-semibold leading-none">{value}</div>
        </div>
    )
}