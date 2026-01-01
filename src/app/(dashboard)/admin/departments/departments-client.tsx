'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { createDepartment, deleteDepartment } from './actions'

export default function DepartmentsClient({ departments, teamId, canManage }: { departments: any[], teamId: string, canManage: boolean }) {
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        const result = await createDepartment(teamId, newName)
        if (result.success) {
            setNewName('')
            setIsCreating(false)
        } else {
            setError(result.error || 'Failed to create')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this department?')) return
        const result = await deleteDepartment(id, teamId)
        if (!result.success) {
            alert(result.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Departments</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Operational Divisions</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
                    >
                        <Plus className="h-4 w-4" />
                        Add Department
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-card border border-border rounded-lg p-6 max-w-md shadow-lg">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <h3 className="font-bold text-foreground uppercase">New Department</h3>
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Department Name (e.g. Engineering)"
                            className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        />
                        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newName.trim()}
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase rounded hover:bg-primary/90 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                    <Link href={`/admin/departments/${dept.id}`} key={dept.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group hover:border-primary/50 transition-all shadow-sm cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-muted-foreground">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{dept.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono">ID: {dept.id.slice(0, 8)}</p>
                            </div>
                        </div>
                        {canManage && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDelete(dept.id)
                                }}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </Link>
                ))}

                {departments.length === 0 && !isCreating && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-lg">
                        <Building2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No departments established.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
