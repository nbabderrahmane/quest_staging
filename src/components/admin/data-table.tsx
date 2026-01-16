'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Badge removed - unused
import { Switch } from "@/components/ui/switch"

interface DataTableProps<T> {
    columns: {
        key: string
        label: string
        render?: (item: T) => React.ReactNode
    }[]
    data: T[]
    onToggleActive?: (id: string, current: boolean) => void
    onEdit?: (item: T) => void
}

export function DataTable<T extends { id: string, is_active?: boolean }>({
    columns,
    data,
    onToggleActive,
    onEdit
}: DataTableProps<T>) {
    return (
        <div className="rounded-md border border-slate-800 bg-slate-900/50">
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-900/50">
                        {columns.map((col) => (
                            <TableHead key={col.key} className="text-slate-400">{col.label}</TableHead>
                        ))}
                        <TableHead className="text-right text-slate-400">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} className="h-24 text-center text-slate-500">
                                No results.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                                {columns.map((col) => (
                                    <TableCell key={col.key} className="text-slate-200">
                                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Switch
                                            checked={item.is_active ?? false}
                                            onCheckedChange={() => onToggleActive?.(item.id, item.is_active ?? false)}
                                        />
                                        <button
                                            onClick={() => onEdit?.(item)}
                                            className="text-xs text-indigo-400 hover:text-indigo-300"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
