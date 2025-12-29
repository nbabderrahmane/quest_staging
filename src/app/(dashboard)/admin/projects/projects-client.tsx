'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, Trash2 } from 'lucide-react'
import { createProject, deleteProject } from './actions'

export default function ProjectsClient({ projects, teamId, canManage }: { projects: any[], teamId: string, canManage: boolean }) {
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState<string | null>(null)

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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to terminate this project?')) return
        const result = await deleteProject(id, teamId)
        if (!result.success) {
            alert(result.error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Projects</h1>
                    <p className="text-slate-500 font-mono text-sm mt-1">Strategic Initiatives</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
                    >
                        <Plus className="h-4 w-4" />
                        Launch Project
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md shadow-lg">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <h3 className="font-bold text-slate-900 uppercase">New Project</h3>
                        <div className="space-y-2">
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Project Name (e.g. Operation Alpha)"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                            />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Description (Optional)"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none h-20"
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newName.trim()}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Launch
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(proj => (
                    <Link href={`/admin/projects/${proj.id}`} key={proj.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-blue-300 transition-all shadow-sm cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 truncate">{proj.name}</h3>
                                {proj.description && (
                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{proj.description}</p>
                                )}
                            </div>
                        </div>
                        {canManage && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDelete(proj.id)
                                }}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </Link>
                ))}

                {projects.length === 0 && !isCreating && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
                        <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No projects active.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
