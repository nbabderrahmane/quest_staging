'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rocket, Plus, Trash2, User, Briefcase } from 'lucide-react'
import { createProject, deleteProject, updateProjectAnalyst } from './actions'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProjectsClient({ projects, teamId, canManage, crew }: { projects: any[], teamId: string, canManage: boolean, crew: any[] }) {
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        const result = await createProject(teamId, newName, description)
        if (result.success) {
            setNewName('')
            setDescription('')
            setIsCreating(false)
        } else {
            setError(result.error || 'Failed to create')
        }
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        const result = await deleteProject(deleteId, teamId)
        if (!result.success) {
            alert(result.error)
        }
        setDeleteId(null)
    }

    const handleAnalystChange = async (projectId: string, analystId: string | null) => {
        const project = projects.find(p => p.id === projectId)
        if (project?.default_analyst_id === (analystId || null)) return

        const result = await updateProjectAnalyst(teamId, projectId, analystId)
        if (!result.success) {
            alert(result.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Projects</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Strategic Initiatives</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors rounded"
                    >
                        <Plus className="h-4 w-4" />
                        Launch Project
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-card border border-border rounded-lg p-6 max-w-md shadow-lg">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <h3 className="font-bold text-foreground uppercase">New Project</h3>
                        <div className="space-y-2">
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Project Name (e.g. Operation Alpha)"
                                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (Optional)"
                                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none h-20"
                            />
                        </div>
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
                                Launch
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                    <div key={project.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group hover:border-primary/50 transition-all shadow-sm relative">
                        <Link href={`/admin/projects/${project.id}`} className="absolute inset-0 z-0 text-transparent">
                            View
                        </Link>
                        <div className="flex items-center gap-3 z-10 pointer-events-none">
                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-muted-foreground pointer-events-auto">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div className="pointer-events-auto">
                                <h3 className="font-bold text-foreground">{project.name}</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {canManage ? (
                                        <select
                                            value={project.default_analyst_id || ''}
                                            onChange={(e) => handleAnalystChange(project.id, e.target.value || null)}
                                            className="text-[10px] bg-transparent border-none p-0 h-auto focus:ring-0 text-muted-foreground font-mono cursor-pointer hover:text-primary transition-colors"
                                        >
                                            <option value="">No Auto-Assign</option>
                                            {crew.map(member => (
                                                <option key={member.id} value={member.id}>
                                                    {member.first_name ? `${member.first_name} ${member.last_name || ''}` : member.email}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {project.default_analyst_id ?
                                                (crew.find(c => c.id === project.default_analyst_id)?.first_name || 'Assigned') :
                                                'Unassigned'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {canManage && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setDeleteId(project.id)
                                }}
                                className="relative z-20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}

                {projects.length === 0 && !isCreating && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-lg">
                        <Briefcase className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No projects active.</p>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Terminate Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project and all associated tasks.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Terminate</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
