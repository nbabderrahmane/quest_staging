'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Plus, Scroll, User, Zap, Target, Trash2, Search, Filter } from 'lucide-react'
import { getTasks, createTask, getCrewForAssignment, getQuestsForDropdown, deleteTask } from './actions'
import { TaskDetailDrawer } from './task-detail-drawer'

interface Task {
    id: string
    title: string
    description: string | null
    created_at: string
    needs_info?: boolean
    assigned_to?: string | null
    status?: { id: string; name: string; category: string } | null
    size?: { id: string; name: string; xp_points: number } | null
    urgency?: { id: string; name: string; color: string } | null
    assignee?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
    quest?: { id: string; name: string } | null
    was_dropped?: boolean
}

interface CrewMember {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
}

interface ForgeItem {
    id: string
    name: string
    color?: string
    xp_points?: number
}

interface QuestOption {
    id: string
    name: string
}

const URGENCY_COLORS: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
}

const STATUS_CATEGORY_COLORS: Record<string, string> = {
    'backlog': 'bg-slate-100 text-slate-600 border-slate-300',
    'active': 'bg-blue-100 text-blue-600 border-blue-300',
    'done': 'bg-green-100 text-green-600 border-green-300',
    'archived': 'bg-gray-100 text-gray-500 border-gray-300',
}

export default function PipelinePage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [teamId, setTeamId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string>('member')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    // Forge data for dropdowns
    const [sizes, setSizes] = useState<ForgeItem[]>([])
    const [urgencies, setUrgencies] = useState<ForgeItem[]>([])
    const [crew, setCrew] = useState<CrewMember[]>([])
    const [questOptions, setQuestOptions] = useState<QuestOption[]>([])

    // Create Modal State
    const [createOpen, setCreateOpen] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newQuestId, setNewQuestId] = useState<string>('')
    const [newSizeId, setNewSizeId] = useState<string>('')
    const [newUrgencyId, setNewUrgencyId] = useState<string>('')
    const [newAssignee, setNewAssignee] = useState<string>('')
    const [isCreating, setIsCreating] = useState(false)

    // Task Detail Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Filter State
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [questFilter, setQuestFilter] = useState<string>('')
    const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'unclaimed' | 'needs_info'>('all')

    const canManage = ['owner', 'admin', 'manager'].includes(userRole)
    const canCreate = ['owner', 'admin', 'manager', 'analyst'].includes(userRole)
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
            setUserId(user.id)
            setUserRole(activeMembership.role)

            // Fetch tasks
            const taskData = await getTasks(cleanTeamId)
            if ('error' in taskData) {
                setError(taskData.error)
            } else {
                setTasks(taskData)
            }

            // Fetch quests for dropdown
            const questData = await getQuestsForDropdown(cleanTeamId)
            setQuestOptions(questData)

            // Fetch sizes and urgencies
            const { data: sizesData } = await supabase
                .from('sizes')
                .select('id, name, xp_points')
                .eq('team_id', cleanTeamId)
                .order('xp_points', { ascending: true })
            if (sizesData) setSizes(sizesData)

            const { data: urgenciesData } = await supabase
                .from('urgencies')
                .select('id, name, color')
                .eq('team_id', cleanTeamId)
            if (urgenciesData) setUrgencies(urgenciesData)

            // Fetch crew for assignment
            const crewData = await getCrewForAssignment(cleanTeamId)
            setCrew(crewData)

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

    const getAssigneeName = (assignee: Task['assignee']) => {
        if (!assignee) return 'Unassigned'
        if (assignee.first_name || assignee.last_name) {
            return `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim()
        }
        return assignee.email
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!teamId || !newTitle) return

        // Optional fields - user can add details later in edit
        const questValue = (newQuestId && newQuestId !== '_none') ? newQuestId : undefined
        const sizeValue = newSizeId || undefined
        const urgencyValue = newUrgencyId || undefined
        const assigneeValue = (newAssignee && newAssignee !== '_none') ? newAssignee : undefined

        setIsCreating(true)
        const result = await createTask(teamId, {
            title: newTitle,
            description: newDescription || undefined,
            quest_id: questValue,
            size_id: sizeValue,
            urgency_id: urgencyValue,
            assigned_to: assigneeValue
        })
        setIsCreating(false)

        if (result.success) {
            const questInfo = result.questName ? ` Assigned to ${result.questName}.` : ''
            setSuccess(`TASK DEPLOYED: New mission added to Pipeline.${questInfo}`)
            setCreateOpen(false)
            setNewTitle('')
            setNewDescription('')
            setNewQuestId('')
            setNewSizeId('')
            setNewUrgencyId('')
            setNewAssignee('')
            // Refresh tasks
            const taskData = await getTasks(teamId)
            if (!('error' in taskData)) {
                setTasks(taskData)
            }
            router.refresh()
        } else {
            setError(result.error || 'Task creation failed')
        }
    }

    const handleDelete = async (taskId: string) => {
        if (!teamId) return
        if (!confirm('ABANDON TASK: This action cannot be undone.')) return

        const result = await deleteTask(taskId, teamId)
        if (result.success) {
            setTasks(prev => prev.filter(t => t.id !== taskId))
            setSuccess('TASK ABANDONED: Mission removed from records.')
            router.refresh()
        } else {
            setError(result.error || 'Deletion failed')
        }
    }

    if (isLoading) {
        return <div className="p-8 text-slate-500 animate-pulse font-mono">Loading Mission Pipeline...</div>
    }

    // Apply client-side filters
    const filteredTasks = tasks.filter(task => {
        // Analyst security: only see assigned tasks or unclaimed
        if (isAnalyst && task.assigned_to && task.assigned_to !== userId) {
            return false
        }
        // Quick filters
        if (quickFilter === 'mine' && task.assigned_to !== userId) {
            return false
        }
        if (quickFilter === 'unclaimed' && task.assigned_to !== null) {
            return false
        }
        if (quickFilter === 'needs_info' && !task.needs_info) {
            return false
        }
        // Search filter
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }
        // Status category filter
        if (statusFilter && task.status?.category !== statusFilter) {
            return false
        }
        // Quest filter
        if (questFilter && questFilter !== '_all') {
            if (questFilter === '_none' && task.quest) return false
            if (questFilter !== '_none' && task.quest?.id !== questFilter) return false
        }
        return true
    })

    // Calculate Potential XP (Sum of XP from all visible tasks that are NOT done/archived)
    const potentialXP = filteredTasks
        .filter(t => t.status?.category !== 'done' && t.status?.category !== 'archived' && !t.was_dropped)
        .reduce((sum, t) => sum + (t.size?.xp_points || 0), 0)

    return (
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-6">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Mission Pipeline</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-slate-500 font-mono text-sm">Task Registry & Operations Center</p>
                        <div className="h-4 w-[1px] bg-slate-300"></div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            <Zap className="h-3 w-3" />
                            Potential XP: {potentialXP}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-blue-600 uppercase font-bold">
                        {filteredTasks.length} of {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors rounded"
                        >
                            <Plus className="h-4 w-4" />
                            Create New Task
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setQuickFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    All Tasks
                </button>
                <button
                    onClick={() => setQuickFilter('mine')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'mine' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    🎯 My Missions
                </button>
                <button
                    onClick={() => setQuickFilter('unclaimed')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'unclaimed' ? 'bg-orange-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    👤 Unclaimed
                </button>
                <button
                    onClick={() => setQuickFilter('needs_info')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'needs_info' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    ⚠️ Needs Info
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="backlog">Backlog</option>
                        <option value="active">Active</option>
                        <option value="done">Done</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div>
                    <select
                        value={questFilter}
                        onChange={(e) => setQuestFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="_all">All Quests</option>
                        <option value="_none">No Quest</option>
                        {questOptions.filter(q => q.id).map(quest => (
                            <option key={quest.id} value={quest.id}>{quest.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Scroll className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Pipeline Registry</h3>
                </div>
                <div className="p-4 overflow-auto max-h-[600px]">
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-12">
                                No tasks match the current filters.
                            </p>
                        ) : (
                            filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => { setSelectedTaskId(task.id); setDetailOpen(true) }}
                                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Status Badge */}
                                        {task.status && (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${STATUS_CATEGORY_COLORS[task.status.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {task.status.name}
                                            </span>
                                        )}

                                        {/* Urgency Badge */}
                                        {task.urgency && (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${URGENCY_COLORS[task.urgency.name] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {task.urgency.name}
                                            </span>
                                        )}

                                        {/* Task Title */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 truncate">{task.title}</p>
                                                {task.quest && (
                                                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                        {task.quest.name}
                                                    </span>
                                                )}
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-slate-500 truncate">{task.description}</p>
                                            )}
                                            {task.was_dropped && (
                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold uppercase rounded border border-red-200">
                                                    Aborted
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-4">
                                        {/* Size/XP Badge */}
                                        {task.size && (
                                            <span className="flex items-center gap-1 text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                <Zap className="h-3 w-3" />
                                                {task.size.xp_points} XP
                                            </span>
                                        )}

                                        {/* Assignee */}
                                        <div className="flex items-center gap-2 text-sm text-slate-600 min-w-[120px]">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <span className="truncate">{getAssigneeName(task.assignee)}</span>
                                        </div>

                                        {/* Delete (Owner only) */}
                                        {isOwner && (
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Abandon Task"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-white border border-slate-200 text-slate-900 shadow-lg max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Create New Task
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="py-4 space-y-4">
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Task Title *</label>
                            <Input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Enter task objective..."
                                required
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Description</label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Optional task details..."
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Quest (Objective)</label>
                            <Select value={newQuestId} onValueChange={setNewQuestId}>
                                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                    <SelectValue placeholder="Select quest..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">No Quest</SelectItem>
                                    {questOptions.length > 0 ? (
                                        questOptions.filter(q => q.id).map(quest => (
                                            <SelectItem key={quest.id} value={quest.id}>
                                                {quest.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="_empty" disabled>No quests available</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Size (XP)</label>
                                <Select value={newSizeId} onValueChange={setNewSizeId}>
                                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                        <SelectValue placeholder="Select size..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sizes.length > 0 ? (
                                            sizes.filter(s => s.id).map(size => (
                                                <SelectItem key={size.id} value={size.id}>
                                                    {size.name} ({size.xp_points} XP)
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="_empty" disabled>No sizes configured</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Urgency</label>
                                <Select value={newUrgencyId} onValueChange={setNewUrgencyId}>
                                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                        <SelectValue placeholder="Select urgency..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {urgencies.length > 0 ? (
                                            urgencies.filter(u => u.id).map(urgency => (
                                                <SelectItem key={urgency.id} value={urgency.id}>
                                                    {urgency.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="_empty" disabled>No urgencies configured</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Assign To</label>
                            <Select value={newAssignee} onValueChange={setNewAssignee}>
                                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">Unassigned</SelectItem>
                                    {crew.length > 0 ? (
                                        crew.filter(m => m.id).map(member => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.first_name || member.last_name
                                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                                    : member.email
                                                }
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="_empty" disabled>No crew available</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
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
                                disabled={isCreating || !newTitle}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isCreating ? 'Creating...' : 'Create New Task'}
                            </button>
                        </DialogFooter>
                    </form>
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

            {/* Task Detail Drawer */}
            {teamId && (
                <TaskDetailDrawer
                    taskId={selectedTaskId}
                    teamId={teamId}
                    open={detailOpen}
                    onClose={() => { setDetailOpen(false); setSelectedTaskId(null) }}
                    canEdit={canManage}
                    quests={questOptions}
                    sizes={sizes.map(s => ({ ...s, xp_points: s.xp_points || 0 }))}
                    urgencies={urgencies.map(u => ({ ...u, color: u.color || '' }))}
                    crew={crew}
                />
            )}
        </div>
    )
}
