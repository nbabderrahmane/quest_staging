'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Target, Calendar, Trash2, Edit, CheckCircle, Circle, Rocket } from 'lucide-react'
import { getQuestObjectives, createQuestObjective, updateQuestObjective, deleteQuestObjective, toggleQuestActive } from './actions'

interface Quest {
    id: string
    name: string
    description: string | null
    start_date: string | null
    end_date: string | null
    is_active: boolean
    created_at: string
    creator?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
    tasks?: {
        id: string
        title: string
        status?: { category: string, name: string }
        assigned_to: string
        assignee?: { first_name: string | null, last_name: string | null, email: string }
    }[]
}

export default function QuestsPage() {
    const [quests, setQuests] = useState<Quest[]>([])
    const [teamId, setTeamId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('member')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Create Modal State
    const [createOpen, setCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newStartDate, setNewStartDate] = useState('')
    const [newEndDate, setNewEndDate] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    // Edit Modal State
    const [editOpen, setEditOpen] = useState(false)
    const [editQuest, setEditQuest] = useState<Quest | null>(null)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editStartDate, setEditStartDate] = useState('')
    const [editEndDate, setEditEndDate] = useState('')

    const canManage = ['owner', 'admin', 'manager'].includes(userRole)
    const canDeploy = ['owner', 'admin', 'manager'].includes(userRole)
    const isOwner = userRole === 'owner'
    const isAnalyst = userRole === 'analyst'

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]?.trim()

            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id, role')
                .eq('user_id', user.id)

            if (!memberships || memberships.length === 0) {
                setError('No alliance memberships found.')
                setIsLoading(false)
                return
            }

            let activeMembership = memberships.find(m => m.team_id === selectedTeamCookie)
            if (!activeMembership) activeMembership = memberships[0]

            const cleanTeamId = activeMembership.team_id.trim()
            setTeamId(cleanTeamId)
            setUserRole(activeMembership.role)

            const questData = await getQuestObjectives(cleanTeamId)
            if ('error' in questData) {
                setError(questData.error)
            } else {
                setQuests(questData)
            }

            setIsLoading(false)
        }
        load()
    }, [])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [error])

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [success])

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '--'
        return new Date(dateStr).toLocaleDateString()
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!teamId || !newName) return

        setIsCreating(true)
        const result = await createQuestObjective(teamId, {
            name: newName,
            description: newDescription || undefined,
            start_date: newStartDate || undefined,
            end_date: newEndDate || undefined
        })
        setIsCreating(false)

        if (result.success) {
            setSuccess('QUEST INITIATED: New objective added.')
            setCreateOpen(false)
            setNewName('')
            setNewDescription('')
            setNewStartDate('')
            setNewEndDate('')
            const questData = await getQuestObjectives(teamId)
            if (!('error' in questData)) {
                setQuests(questData)
            }
        } else {
            setError(result.error || 'Quest creation failed')
        }
    }

    const handleEditOpen = (quest: Quest) => {
        setEditQuest(quest)
        setEditName(quest.name)
        setEditDescription(quest.description || '')
        setEditStartDate(quest.start_date || '')
        setEditEndDate(quest.end_date || '')
        setEditOpen(true)
    }

    const handleEditSave = async () => {
        if (!editQuest || !teamId) return

        const result = await updateQuestObjective(editQuest.id, teamId, {
            name: editName,
            description: editDescription || undefined,
            start_date: editStartDate || undefined,
            end_date: editEndDate || undefined
        })

        if (result.success) {
            setSuccess('QUEST UPDATED: Objective modified.')
            setEditOpen(false)
            const questData = await getQuestObjectives(teamId)
            if (!('error' in questData)) {
                setQuests(questData)
            }
        } else {
            setError(result.error || 'Update failed')
        }
    }

    const handleToggleActive = async (quest: Quest) => {
        if (!teamId) return
        if (isAnalyst) {
            setError('INSUFFICIENT CLEARANCE: Analysts cannot deploy quests.')
            return
        }

        const result = await toggleQuestActive(quest.id, teamId, !quest.is_active)

        if (result.success) {
            // Refresh all quests since activating one deactivates others
            const questData = await getQuestObjectives(teamId)
            if (!('error' in questData)) {
                setQuests(questData)
            }
            setSuccess(`QUEST ${!quest.is_active ? 'DEPLOYED' : 'RECALLED'}.`)
        } else {
            setError(result.error || 'Deployment failed')
        }
    }

    const handleDelete = async (questId: string) => {
        if (!teamId) return
        if (!confirm('ABANDON QUEST: This will also orphan all linked tasks. Continue?')) return

        const result = await deleteQuestObjective(questId, teamId)
        if (result.success) {
            setQuests(prev => prev.filter(q => q.id !== questId))
            setSuccess('QUEST ABANDONED: Objective removed.')
        } else {
            setError(result.error || 'Deletion failed')
        }
    }

    if (isLoading) {
        return <div className="p-8 text-slate-500 animate-pulse font-mono">Loading Quest Objectives...</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-6">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Quest Objectives</h1>
                    <p className="text-slate-500 font-mono text-sm mt-1">Strategic Milestones & Sprints</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-blue-600 uppercase font-bold">
                        {quests.filter(q => q.is_active).length} Active
                    </div>
                    {canManage && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
                        >
                            <Plus className="h-4 w-4" />
                            Initiate Quest
                        </button>
                    )}
                </div>
            </div>

            {/* Quest List */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Objectives Registry</h3>
                </div>
                <div className="p-4 overflow-auto max-h-[800px]">
                    <div className="space-y-4">
                        {quests.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-12">
                                No quests initiated. Create an objective to organize your tasks.
                            </p>
                        ) : (
                            quests.map(quest => (
                                <div
                                    key={quest.id}
                                    className={`flex flex-col p-4 border rounded-lg transition-colors ${quest.is_active
                                        ? 'bg-slate-50 border-slate-200 shadow-sm'
                                        : 'bg-slate-100 border-slate-200 opacity-60' // Reduced opacity for inactive
                                        }`}
                                >
                                    {/* Quest Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* Status Icon */}
                                            <button
                                                onClick={() => handleToggleActive(quest)}
                                                className={`mt-1 p-1 rounded ${quest.is_active ? 'text-green-600' : 'text-slate-400'}`}
                                                title={quest.is_active ? 'Active' : 'Archived'}
                                            >
                                                {quest.is_active ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 text-lg flex items-center gap-3">
                                                    {quest.name}
                                                    {quest.is_active && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Active</span>}
                                                </h4>
                                                {quest.description && (
                                                    <p className="text-sm text-slate-600 mt-1">{quest.description}</p>
                                                )}

                                                {/* Quest Stats / Metadata inside header */}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-mono">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(quest.start_date)} → {formatDate(quest.end_date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Target className="h-3 w-3" />
                                                        <span>{quest.tasks?.length || 0} Tasks</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quest Actions */}
                                        <div className="flex items-center gap-2 ml-4 self-start">
                                            {!quest.is_active && canDeploy && (
                                                <button
                                                    onClick={() => handleToggleActive(quest)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold uppercase rounded hover:bg-green-700 transition-colors"
                                                    title="Deploy Quest"
                                                >
                                                    <Rocket className="h-3 w-3" />
                                                    Deploy
                                                </button>
                                            )}
                                            {quest.is_active && canDeploy && (
                                                <button
                                                    onClick={() => handleToggleActive(quest)}
                                                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold uppercase rounded hover:bg-slate-50 transition-colors"
                                                >
                                                    Recall
                                                </button>
                                            )}

                                            {canManage && (
                                                <>
                                                    <button onClick={() => handleEditOpen(quest)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    {isOwner && (
                                                        <button onClick={() => handleDelete(quest.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Linked Tasks List - Only if has tasks */}
                                    {quest.tasks && quest.tasks.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                                            <h5 className="text-xs font-bold uppercase text-slate-400 mb-2 pl-1">Mission Log</h5>
                                            <div className="space-y-1">
                                                {quest.tasks.map(task => (
                                                    <div key={task.id} className="flex items-center justify-between px-3 py-2 bg-white/50 rounded border border-slate-200/50 hover:bg-white hover:border-slate-300 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${task.status?.category === 'done' ? 'bg-green-500' : task.status?.category === 'active' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                            <span className={`text-sm font-medium ${task.status?.category === 'done' ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs">
                                                            <span className="text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                                {task.status?.name || 'Unknown'}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 text-slate-500 w-24 justify-end truncate">
                                                                <span className="truncate">
                                                                    {task.assignee?.first_name
                                                                        ? `${task.assignee.first_name} ${task.assignee.last_name || ''}`
                                                                        : (task.assignee?.email?.split('@')[0] || 'Unassigned')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Quest Modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-white border border-slate-200 text-slate-900 shadow-lg max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Initiate Quest
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="py-4 space-y-4">
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Quest Name *</label>
                            <Input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Alpha Sprint, Beta Launch..."
                                required
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Description</label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Optional objective summary..."
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Start Date</label>
                                <Input
                                    type="date"
                                    value={newStartDate}
                                    onChange={(e) => setNewStartDate(e.target.value)}
                                    className="bg-white border-slate-300 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">End Date</label>
                                <Input
                                    type="date"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                    className="bg-white border-slate-300 text-slate-900"
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="px-4 py-2 text-sm font-bold uppercase text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating || !newName}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Initiate Quest'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Quest Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-white border border-slate-200 text-slate-900 shadow-lg max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-slate-900">Edit Quest</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Quest Name</label>
                            <Input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-white border-slate-300 text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Start Date</label>
                                <Input
                                    type="date"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                    className="bg-white border-slate-300 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">End Date</label>
                                <Input
                                    type="date"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                    className="bg-white border-slate-300 text-slate-900"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-bold uppercase text-slate-500 hover:text-slate-700">Cancel</button>
                        <button onClick={handleEditSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase rounded hover:bg-blue-700">Save Changes</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold text-red-600 mb-1">Error</p>
                            <p>{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {success && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold text-green-600 mb-1">Success</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">✕</button>
                    </div>
                </div>
            )}
        </div>
    )
}
