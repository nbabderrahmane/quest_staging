'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Plus, Scroll, User, Zap, Target, Trash2, Search, Filter } from 'lucide-react'
import { getTasks, createTask, getCrewForAssignment, getQuestsForDropdown, deleteTask, getProjectsForDropdown, getDepartmentsForDropdown, getClientsForDropdown } from './actions'
import { TaskDetailDrawer } from './task-detail-drawer'
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog'
import { Size, Urgency, Status } from '@/lib/types'

interface Task {
    id: string
    title: string
    description: string | null
    created_at: string
    needs_info?: boolean
    assigned_to?: string | null
    status?: Status | null
    size?: Size | null
    urgency?: Urgency | null
    assignee?: { id: string; email: string; first_name: string | null; last_name: string | null } | null
    quest?: { id: string; name: string } | null
    project?: { id: string; name: string } | null
    department?: { id: string; name: string } | null
    client?: { id: string; name: string } | null
    was_dropped?: boolean
}

interface CrewMember {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    // Map to user_id for CreateTaskDialog compatibility if needed, or just use id
    user_id?: string
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

interface Option {
    id: string
    name: string
}

const URGENCY_COLORS: Record<string, string> = {
    'Critical': 'bg-destructive/10 text-destructive border-destructive/20',
    'High': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'Medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Low': 'bg-green-500/10 text-green-500 border-green-500/20',
}

const STATUS_CATEGORY_COLORS: Record<string, string> = {
    'backlog': 'bg-muted text-muted-foreground border-border',
    'active': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'done': 'bg-green-500/10 text-green-500 border-green-500/20',
    'archived': 'bg-muted/50 text-muted-foreground/50 border-border',
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

    const [statuses, setStatuses] = useState<Status[]>([])
    const [sizes, setSizes] = useState<Size[]>([])
    const [urgencies, setUrgencies] = useState<Urgency[]>([])
    const [crew, setCrew] = useState<CrewMember[]>([])
    const [questOptions, setQuestOptions] = useState<QuestOption[]>([])
    const [projectOptions, setProjectOptions] = useState<Option[]>([])
    const [departmentOptions, setDepartmentOptions] = useState<Option[]>([])
    const [clientOptions, setClientOptions] = useState<Option[]>([])

    // Create Modal State
    const [createOpen, setCreateOpen] = useState(false)

    // Task Detail Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Filter State
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [questFilter, setQuestFilter] = useState<string>('')
    const [projectFilter, setProjectFilter] = useState<string>('')
    const [departmentFilter, setDepartmentFilter] = useState<string>('')
    const [clientFilter, setClientFilter] = useState<string>('')
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

            // Fetch quests, projects, departments for dropdowns
            const [questData, projectData, departmentData, clientData] = await Promise.all([
                getQuestsForDropdown(cleanTeamId),
                getProjectsForDropdown(cleanTeamId),
                getDepartmentsForDropdown(cleanTeamId),
                getClientsForDropdown(cleanTeamId)
            ])
            setQuestOptions(questData)
            setProjectOptions(projectData)
            setDepartmentOptions(departmentData)
            setClientOptions(clientData)

            // Fetch sizes
            const { data: sizesData } = await supabase
                .from('sizes')
                .select('id, name, xp_points, team_id, sort_order, is_active')
                .eq('team_id', cleanTeamId)
                .order('xp_points', { ascending: true })
            if (sizesData) setSizes(sizesData as unknown as Size[])

            // Fetch urgencies
            const { data: urgenciesData } = await supabase
                .from('urgencies')
                .select('id, name, color, weight, team_id, is_active')
                .eq('team_id', cleanTeamId)
            if (urgenciesData) setUrgencies(urgenciesData as unknown as Urgency[])

            // Fetch statuses
            const { data: statusData } = await supabase
                .from('statuses')
                .select('id, name, category, rank, team_id, sort_order, is_active')
                .eq('team_id', cleanTeamId)
                .order('rank', { ascending: true })
            if (statusData) setStatuses(statusData as unknown as Status[])

            // Fetch crew for assignment
            const crewData = await getCrewForAssignment(cleanTeamId)
            setCrew((crewData || []).map((c: any) => ({ ...c, user_id: c.id })))

            setIsLoading(false)
        }
        load()
    }, [])

    const refreshTasks = async () => {
        if (!teamId) return
        const taskData = await getTasks(teamId)
        if (!('error' in taskData)) {
            setTasks(taskData)
        }
        router.refresh()
    }

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

    const handleDelete = async (taskId: string) => {
        if (!teamId) return
        if (!confirm('ABANDON TASK: This action cannot be undone.')) return

        const result = await deleteTask(taskId, teamId)
        if (result.success) {
            setTasks(prev => prev.filter(t => t.id !== taskId))
            setSuccess('TASK ABANDONED: Mission removed from records.')
            router.refresh()
        } else {
            setError(result.error?.message || 'Deletion failed')
        }
    }

    if (isLoading) {
        return <div className="p-8 text-muted-foreground animate-pulse font-mono">Loading Mission Pipeline...</div>
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
        // Project filter
        if (projectFilter && projectFilter !== '_all') {
            if (projectFilter === '_none' && task.project) return false
            if (projectFilter !== '_none' && task.project?.id !== projectFilter) return false
        }
        // Department filter
        if (departmentFilter && departmentFilter !== '_all') {
            if (departmentFilter === '_none' && task.department) return false
            if (departmentFilter !== '_none' && task.department?.id !== departmentFilter) return false
        }
        // Client filter
        if (clientFilter && clientFilter !== '_all') {
            if (clientFilter === '_none' && task.client) return false
            if (clientFilter !== '_none' && task.client?.id !== clientFilter) return false
        }
        return true
    })

    // Calculate Potential XP (Sum of XP from all visible tasks that are NOT done/archived)
    const potentialXP = filteredTasks
        .filter(t => t.status?.category !== 'done' && t.status?.category !== 'archived' && !t.was_dropped)
        .reduce((sum, t) => sum + (t.size?.xp_points || 0), 0)

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-border pb-4 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">Mission Pipeline</h1>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                        <p className="text-muted-foreground font-mono text-xs md:text-sm">Task Registry & Operations Center</p>
                        <div className="hidden md:block h-4 w-[1px] bg-border"></div>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            <Zap className="h-3 w-3" />
                            Potential XP: {potentialXP}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-xs font-mono text-blue-600 uppercase font-bold">
                        {filteredTasks.length} of {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary text-primary-foreground text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors rounded"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden md:inline">Create New Task</span>
                            <span className="md:hidden">New Task</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setQuickFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
                >
                    All Tasks
                </button>
                <button
                    onClick={() => setQuickFilter('mine')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'mine' ? 'bg-purple-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
                >
                    🎯 My Missions
                </button>
                <button
                    onClick={() => setQuickFilter('unclaimed')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'unclaimed' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
                >
                    👤 Unclaimed
                </button>
                <button
                    onClick={() => setQuickFilter('needs_info')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${quickFilter === 'needs_info' ? 'bg-destructive text-destructive-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
                >
                    ⚠️ Needs Info
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
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
                        className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                        <option value="_all">All Quests</option>
                        <option value="_none">No Quest</option>
                        {questOptions.filter(q => q.id).map(quest => (
                            <option key={quest.id} value={quest.id}>{quest.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                        <option value="_all">All Projects</option>
                        <option value="_none">No Project</option>
                        {projectOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                        <option value="_all">All Departments</option>
                        <option value="_none">No Department</option>
                        {departmentOptions.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                        <option value="_all">All Clients</option>
                        <option value="_none">No Client</option>
                        {clientOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-card border border-border rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-center gap-2">
                    <Scroll className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pipeline Registry</h3>
                </div>
                <div className="p-4 overflow-auto max-h-[600px]">
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-12">
                                No tasks match the current filters.
                            </p>
                        ) : (
                            filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => { setSelectedTaskId(task.id); setDetailOpen(true) }}
                                    className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-muted/5 border border-border rounded-lg hover:bg-muted/10 transition-colors cursor-pointer gap-3 md:gap-0"
                                >
                                    <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0">
                                        {/* Status Badge */}
                                        {task.status && (
                                            <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded border ${STATUS_CATEGORY_COLORS[task.status.category] || 'bg-muted text-muted-foreground border-border'}`}>
                                                {task.status.name}
                                            </span>
                                        )}

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-bold text-foreground text-sm md:text-base truncate max-w-full">{task.title}</p>

                                                {/* Desktop Urgency */}
                                                {task.urgency && (
                                                    <span className={`hidden md:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${URGENCY_COLORS[task.urgency.name] || 'bg-muted text-muted-foreground border-border'}`}>
                                                        {task.urgency.name}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Mobile Urgency */}
                                                {task.urgency && (
                                                    <span className={`md:hidden text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${URGENCY_COLORS[task.urgency.name] || 'bg-muted text-muted-foreground border-border'}`}>
                                                        {task.urgency.name}
                                                    </span>
                                                )}

                                                {task.quest && (
                                                    <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded truncate max-w-[100px]">
                                                        {task.quest.name}
                                                    </span>
                                                )}
                                                {task.project && (
                                                    <span className="text-[10px] font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 truncate max-w-[100px]">
                                                        {task.project.name}
                                                    </span>
                                                )}
                                                {task.client && (
                                                    <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 truncate max-w-[100px]">
                                                        {task.client.name}
                                                    </span>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 md:ml-4 border-t md:border-t-0 border-border pt-2 md:pt-0 mt-1 md:mt-0">
                                        {/* Size/XP Badge */}
                                        {task.size && (
                                            <span className="flex items-center gap-1 text-xs font-mono text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                                                <Zap className="h-3 w-3" />
                                                {task.size.xp_points} XP
                                            </span>
                                        )}

                                        {/* Assignee */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground md:min-w-[120px] justify-end">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate max-w-[100px] md:max-w-none">{getAssigneeName(task.assignee)}</span>
                                        </div>

                                        {/* Delete (Owner only) */}
                                        {isOwner && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(task.id)
                                                }}
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
            {teamId && (
                <CreateTaskDialog
                    teamId={teamId}
                    sizes={sizes}
                    urgencies={urgencies}
                    statuses={statuses}
                    projects={projectOptions}
                    departments={departmentOptions}
                    clients={clientOptions}
                    questOptions={questOptions}
                    crew={crew.map(c => ({ user_id: c.id, ...c }))}
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        setSuccess("TASK DEPLOYED: New mission added to Pipeline.")
                        refreshTasks()
                    }}
                />
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-destructive text-destructive-foreground text-sm rounded-lg shadow-lg border border-destructive/20 animate-in slide-in-from-bottom-5">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold mb-1">Error</p>
                            <p>{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-destructive-foreground/70 hover:text-destructive-foreground">✕</button>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {success && (
                <div className="fixed bottom-20 right-4 z-50 max-w-sm p-4 bg-green-500 text-white text-sm rounded-lg shadow-lg border border-green-600/20 animate-in slide-in-from-bottom-5">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="uppercase font-bold mb-1">Success</p>
                            <p>{success}</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-white/70 hover:text-white">✕</button>
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
                    canEdit={canManage || isAnalyst}
                    quests={questOptions}
                    sizes={sizes.map(s => ({ ...s, xp_points: s.xp_points || 0 }))}
                    urgencies={urgencies.map(u => ({ ...u, color: u.color || '' }))}
                    crew={crew}
                    projects={projectOptions}
                    departments={departmentOptions}
                    clients={clientOptions}
                />
            )}
        </div>
    )
}
