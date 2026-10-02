
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
    VisibilityState
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StudentActions } from './student-actions'
import { Search, ChevronDown, ArrowUpDown, UserCheck, MessageCircle, Copy } from 'lucide-react'
import Image from 'next/image'
import Fuse from 'fuse.js'
import { normalizeDobToIso } from '@/lib/date'
import { useAppNavigation } from '@/components/app/navigation-provider'
import { toast } from 'sonner'
import { AthletePfp } from '@/components/ui/enlarged-pfp-dialog'

interface Student {
    id: string
    name: string
    gender: string
    rank: string | null
    weight: number | null
    date_of_birth: string | null
    dojo_id: string
    dojos?: { name: string } | null
    registration_no?: string | null
    is_active?: boolean
    photo_url?: string | null
    parent_id?: string | null
    parent?: {
        name: string | null
        email: string | null
        phone: string | null
    } | null
}

interface StudentDataTableProps {
    data: Student[]
    dojos: { id: string, name: string }[]
    initialDojoFilter?: string
}

export function StudentDataTable({ data, dojos, initialDojoFilter }: StudentDataTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { beginNavigation } = useAppNavigation()

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [globalFilter, setGlobalFilter] = useState('')

    const [dojoFilter, setDojoFilter] = useState<string>('all')

    // Fuse.js instance for fuzzy search
    const fuse = useMemo(() => new Fuse(data, {
        keys: ['name', 'dojos.name', 'rank', 'parent.name', 'parent.email', 'parent.phone'],
        threshold: 0.3,
        distance: 100,
    }), [data]);

    // Filtered Data based on Global Search (Fuse.js)
    const filteredData = useMemo(() => {
        if (!globalFilter) return data;
        return fuse.search(globalFilter).map(result => result.item);
    }, [data, globalFilter, fuse]);

    // Table Columns definition
    const columns: ColumnDef<Student>[] = [
        {
            accessorKey: "registration_no",
            header: "Reg ID",
            cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("registration_no") || "-"}</div>,
        },
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const photo = row.original.photo_url
                const name = row.getValue("name") as string
                return (
                    <div className="flex items-center gap-2.5 pl-2">
                        <AthletePfp
                            photoUrl={photo}
                            name={name}
                            subtitle={row.original.registration_no}
                            size={32}
                            extraDetails={{
                                dojo: row.original.dojos?.name,
                                gender: row.original.gender,
                                rank: row.original.rank,
                                phone: row.original.parent?.phone || undefined,
                            }}
                        />
                        <span className="font-medium">{name}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") !== false; // Default true if undefined
                return (
                    <div className="flex items-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                )
            },
            filterFn: (row, id, value) => {
                const isActive = row.getValue(id) !== false;
                if (value === 'all') return true;
                if (value === 'active') return isActive;
                if (value === 'inactive') return !isActive;
                return true;
            }
        },
        {
            accessorKey: "dojoName", // Virtual column for filtering
            id: "dojo",
            accessorFn: (row) => row.dojos?.name || "Unknown",
            header: "Dojo",
            cell: ({ row }) => <div>{row.original.dojos?.name}</div>,
            filterFn: (row, id, value) => {
                return value === "all" || row.getValue(id) === value
            },
        },
        {
            accessorKey: "gender",
            header: "Gender",
            cell: ({ row }) => <div className="capitalize">{row.getValue("gender")}</div>,
            filterFn: (row, id, value) => {
                return value === "all" || row.getValue(id) === value
            },
        },
        {
            accessorKey: "rank",
            header: "Rank",
            cell: ({ row }) => <div className="capitalize">{row.getValue("rank") || "-"}</div>,
        },
        {
            accessorKey: "weight",
            header: "Weight",
            cell: ({ row }) => {
                const w = row.getValue("weight")
                return <div>{w ? `${w} kg` : '-'}</div>
            },
        },
        {
            accessorKey: "date_of_birth",
            header: "DOB",
            cell: ({ row }) => {
                const raw = row.getValue("date_of_birth")
                const normalized = normalizeDobToIso(raw)
                return <div>{normalized || (raw != null ? String(raw) : '-')}</div>
            },
        },
        {
            id: "added_by",
            header: "Added By",
            cell: ({ row }) => {
                const parent = row.original.parent
                if (!parent) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
                            Coach
                        </span>
                    )
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://entrydesk.in'
                const loginHelpMsg = `Namaste ${parent.name || 'there'} 🙏\nHere are your EntryDesk login details for ${row.original.name}:\n• Email: ${parent.email || 'your registered email'}\n• Login Link: ${origin}/login\n\nSteps to sign in:\n1. Open the login link above.\n2. Enter your email (${parent.email || ''}).\n3. Enter the 6-digit code sent to your inbox. No password needed!`
                const phoneClean = parent.phone?.replace(/[^0-9]/g, '')

                return (
                    <div className="flex flex-col text-xs space-y-1">
                        <span className="font-medium text-foreground flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[160px] 2xl:max-w-[240px]">{parent.name || 'Athlete / Parent'}</span>
                        </span>
                        {parent.email && (
                            <a
                                href={`mailto:${parent.email}`}
                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-[130px] sm:max-w-[180px] 2xl:max-w-[260px]"
                                title={parent.email}
                            >
                                {parent.email}
                            </a>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5">
                            {parent.phone && (
                                <span className="text-[10px] text-muted-foreground font-mono">{parent.phone}</span>
                            )}
                            {phoneClean ? (
                                <a
                                    href={`https://wa.me/${phoneClean.startsWith('91') ? phoneClean : '91' + phoneClean}?text=${encodeURIComponent(loginHelpMsg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#128C7E] dark:text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 px-2 py-0.5 rounded-full transition-colors"
                                    title="Send WhatsApp Login Help"
                                >
                                    <MessageCircle className="h-3 w-3 text-[#25D366]" />
                                    WhatsApp Help
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(loginHelpMsg)
                                        toast.success('Login help message copied to clipboard!')
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded-full transition-colors"
                                    title="Copy login help message to clipboard"
                                >
                                    <Copy className="h-3 w-3" />
                                    Copy Help
                                </button>
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const student = row.original
                return <StudentActions student={student} dojos={dojos} />
            },
        },
    ]

    const table = useReactTable({
        data: filteredData,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    // Filter Handlers
    const setFilter = (columnId: string, value: string) => {
        table.getColumn(columnId)?.setFilterValue(value === 'all' ? undefined : value)
    }

    useEffect(() => {
        const urlDojo = searchParams.get('dojo')
        const desired = urlDojo ?? initialDojoFilter ?? 'all'

        const exists = desired !== 'all' && dojos.some((d) => d.name === desired)
        const next = exists ? desired : 'all'

        setDojoFilter(next)
        table.getColumn('dojo')?.setFilterValue(next === 'all' ? undefined : next)
    }, [dojos, initialDojoFilter, searchParams, table])

    return (
        <div className="w-full space-y-4">
            {/* Search and Filters Toolbar */}
            <div className="flex flex-col items-start justify-between gap-4 py-2 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students (fuzzy)..."
                        value={globalFilter}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="h-9 rounded-md pl-8 border-border bg-card shadow-2xs text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                    />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={dojoFilter}
                        onValueChange={(val) => {
                            setDojoFilter(val)
                            setFilter("dojo", val)

                            const params = new URLSearchParams(searchParams)
                            if (val === 'all') params.delete('dojo')
                            else params.set('dojo', val)

                            // Reset paging when switching filters.
                            params.delete('page')

                            beginNavigation()
                            router.push(`?${params.toString()}`)
                        }}
                    >
                        <SelectTrigger className={cn(
                            "h-9 w-auto min-w-[110px] max-w-[180px] text-xs font-medium rounded-md px-2.5 py-1 gap-1.5 transition-all shadow-2xs",
                            dojoFilter !== 'all'
                                ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                                : "border-border bg-card hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                        )}>
                            <span className="text-muted-foreground font-normal">Dojo:</span>
                            <span className="font-semibold truncate">{dojoFilter === 'all' ? 'All' : dojoFilter}</span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Dojos</SelectItem>
                            {dojos.map(dojo => (
                                <SelectItem key={dojo.id} value={dojo.name}>{dojo.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select onValueChange={(val) => setFilter("gender", val)}>
                        <SelectTrigger className="h-9 w-auto min-w-[95px] text-xs font-medium rounded-md px-2.5 py-1 gap-1.5 border-border bg-card hover:bg-accent/60 text-muted-foreground hover:text-foreground shadow-2xs">
                            <span className="text-muted-foreground font-normal">Gender:</span>
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select onValueChange={(val) => setFilter("is_active", val)}>
                        <SelectTrigger className="h-9 w-auto min-w-[95px] text-xs font-medium rounded-md px-2.5 py-1 gap-1.5 border-border bg-card hover:bg-accent/60 text-muted-foreground hover:text-foreground shadow-2xs">
                            <span className="text-muted-foreground font-normal">Status:</span>
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto h-9 rounded-md border-border bg-card hover:bg-accent shadow-2xs">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs dark:border-white/[0.10] dark:bg-white/[0.02]">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="py-1 text-sm text-muted-foreground">
                Showing {table.getFilteredRowModel().rows.length} row(s) on this page.
            </div>
        </div>
    )
}
