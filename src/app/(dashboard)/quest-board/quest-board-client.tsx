'use client'

import { useState, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, Target, Layers, User, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { getTasks, updateTaskStatus } from './actions'
import { TaskDetailDrawer } from '@/app/(dashboard)/admin/pipeline/task-detail-drawer'
import { BossDisplay } from '@/components/quest-board/boss-display'

interface Quest {
    id: string
    name: string
    is_active?: boolean
    boss_skin?: string
}

interface Status {
    id: string
    name: string
    category?: string
}

interface Task {
    id: string
    title: string
    description?: string | null
    status_id: string
    size_id?: string | null
    urgency_id?: string | null
    quest_id?: string | null
    assigned_to?: string | null
    status?: { id: string; name: string; category?: string } | null
    size?: { id: string; name: string; xp_points?: number } | null
    urgency?: { id: string; name: string; color?: string } | null
    quest?: { id: string; name: string } | null
}

interface Boss {
    id: string
    name: string
    is_system: boolean
    image_healthy: string
    image_bloody: string
    image_dead: string
}

interface QuestBoardClientProps {
    quests: Quest[]
    statuses: Status[]
    sizes: { id: string; name: string; xp_points?: number }[]
    urgencies: { id: string; name: string; color?: string }[]
    crew: { id: string; email: string; first_name: string | null; last_name: string | null }[]
    teamId: string
    canEdit: boolean
    userId: string
    userRole: string
    bosses: Boss[]
}

const URGENCY_COLORS: Record<string, string> = {
    'Critical': 'bg-destructive/10 text-destructive border-destructive/20',
    'High': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'Medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Low': 'bg-green-500/10 text-green-500 border-green-500/20',
}

const STATUS_BG: Record<string, string> = {
    'Backlog': 'bg-muted/50',
    'In Progress': 'bg-blue-500/5',
    'Review': 'bg-purple-500/5',
    'Done': 'bg-green-500/5',
}

export function QuestBoardClient({ quests, statuses, sizes, urgencies, teamId, canEdit, crew, userId, userRole, bosses }: QuestBoardClientProps) {

    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedQuestId, setSelectedQuestId] = useState<string>(() => {
        const activeQuest = quests.find(q => q.is_active)
        if (activeQuest) return activeQuest.id
        if (quests.length > 0) return quests[0].id
        return ''
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const isAnalyst = userRole === 'analyst'

    // Task Detail Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Load tasks when quest changes
    useEffect(() => {
        let mounted = true
        async function loadTasks() {
            if (!selectedQuestId) {
                if (mounted) setTasks([])
                return
            }
            if (mounted) setIsLoading(true)
            const taskData = await getTasks(selectedQuestId, teamId)
            if (mounted) {
                setTasks(taskData || [])
                setIsLoading(false)
            }
        }
        loadTasks()
        return () => { mounted = false }
    }, [selectedQuestId, teamId])

    const [selectedAssignee, setSelectedAssignee] = useState<string>('all')

    // Filter tasks by search, analyst role, and assignee
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // 1. Analyst Restriction
            if (isAnalyst && task.assigned_to !== userId) {
                return false
            }

            // 2. Search
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
            if (!matchesSearch) return false

            // 3. Assignee Filter
            if (selectedAssignee === 'all') return true
            if (selectedAssignee === 'unassigned') return !task.assigned_to
            return task.assigned_to === selectedAssignee
        })
    }, [tasks, isAnalyst, userId, searchQuery, selectedAssignee])

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {}
        for (const status of statuses) {
            grouped[status.id] = filteredTasks.filter(t => t.status_id === status.id)
        }
        return grouped
    }, [statuses, filteredTasks])

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId)
    }

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault()
        const taskId = e.dataTransfer.getData('taskId')
        if (!taskId) return

        // Confetti Check
        const targetStatus = statuses.find(s => s.id === statusId)
        console.log('🎊 Drop Debug:', { taskId, statusId, targetCategory: targetStatus?.category })

        if (targetStatus?.category === 'done') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#ffffff', '#fbbf24']
            })
        }

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: statusId } : t))

        try {
            await updateTaskStatus(taskId, statusId, teamId)
        } catch (error) {
            console.error('Failed to update task status', error)
            // Revert on error
            const taskData = await getTasks(selectedQuestId, teamId)
            setTasks(taskData || [])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const currentQuest = quests.find(q => q.id === selectedQuestId)

    // Resolve Boss Data
    // 1. Try to find by ID (new system)
    let activeBoss = bosses.find(b => b.id === currentQuest?.boss_skin)
    // 2. If legacy 'generic_monster' or not found, try to find Titan Kong
    if (!activeBoss) {
        if (currentQuest?.boss_skin === 'generic_monster') {
            activeBoss = bosses.find(b => b.name === 'The Titan Kong')
        }
    }
    // 3. Absolute fallback is handled inside BossDisplay but we can pass undefined

    // Boss Battle Logic
    const totalXP = tasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)
    const completedXP = tasks
        .filter(t => t.status?.category === 'done')
        .reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)

    const bossMaxHP = totalXP > 0 ? totalXP : 100 // Avoid division by zero
    // Invert progress: Boss HP = Total - Completed
    // If completed = 0, Boss HP = Total (100%)
    // If completed = Total, Boss HP = 0 (0%)
    const bossCurrentHP = Math.max(0, bossMaxHP - completedXP)
    const bossHealthPercent = (bossCurrentHP / bossMaxHP) * 100

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId)
        setDetailOpen(true)
    }

    const handleDrawerClose = async () => {
        setDetailOpen(false)
        setSelectedTaskId(null)
        // Refresh tasks after drawer closes
        if (selectedQuestId) {
            const taskData = await getTasks(selectedQuestId, teamId)
            setTasks(taskData || [])
        }
    }

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-6">
            {/* Control Bar */}
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
                    {/* Boss Visualization */}
                    <div className="hidden md:block">
                        <BossDisplay
                            bossData={activeBoss}
                            currentHealth={bossCurrentHP}
                            maxHealth={bossMaxHP}
                        />
                    </div>

                    <div className="w-full md:w-auto">
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">Quest Board</h1>
                        <p className="text-muted-foreground font-mono text-xs md:text-sm mt-1 mb-2">
                            {currentQuest ? currentQuest.name : 'Select a Quest'}
                        </p>

                        {/* Boss Health Bar */}
                        {selectedQuestId && (
                            <div className="w-full md:w-64 space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span className="text-destructive">Boss HP</span>
                                    <span className="text-muted-foreground">{Math.round(bossHealthPercent)}%</span>
                                </div>
                                <div className="h-4 w-full bg-muted rounded-full overflow-hidden border border-border">
                                    <div
                                        className={`h-full transition-all duration-500 ${bossHealthPercent < 25 ? 'bg-destructive animate-pulse' : 'bg-red-500'}`}
                                        style={{ width: `${bossHealthPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full md:w-64 bg-background border-border text-foreground"
                        />
                    </div>

                    {/* Assignee Filter - Hidden for Analysts */}
                    {!isAnalyst && (
                        <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                            <SelectTrigger className="w-full md:w-[180px] bg-background border-border text-foreground">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="All Crew" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Crew</SelectItem>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {crew.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.first_name || 'Unknown'} {member.last_name || ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Quest Filter */}
                    <Select value={selectedQuestId} onValueChange={setSelectedQuestId}>
                        <SelectTrigger className="w-full md:w-[220px] bg-background border-border text-foreground">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <SelectValue placeholder="Select Quest" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {quests.length === 0 ? (
                                <SelectItem value="none" disabled>No quests available</SelectItem>
                            ) : (
                                quests.map(quest => (
                                    <SelectItem key={quest.id} value={quest.id}>
                                        {quest.name} {quest.is_active && '(Active)'}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Empty State */}
            {!selectedQuestId && (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground">No Quest Selected</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Select a quest from the dropdown to view its tasks.
                    </p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <div className="animate-pulse text-slate-500 font-mono">Loading tasks...</div>
                </div>
            )}

            {/* Kanban Board */}
            {selectedQuestId && !isLoading && (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {statuses.map(status => (
                        <div
                            key={status.id}
                            onDrop={(e) => handleDrop(e, status.id)}
                            onDragOver={handleDragOver}
                            className={`flex-shrink-0 w-80 ${STATUS_BG[status.name] || 'bg-muted/10'} border border-border rounded-lg`}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        {status.name}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {tasksByStatus[status.id]?.length || 0}
                                </span>
                            </div>

                            {/* Tasks */}
                            <div className="p-3 space-y-3 min-h-[200px] max-h-[500px] overflow-y-auto">
                                {tasksByStatus[status.id]?.length === 0 ? (
                                    <p className="text-slate-400 text-xs text-center py-8">No tasks</p>
                                ) : (
                                    tasksByStatus[status.id]?.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => handleTaskClick(task.id)}
                                            className="bg-card border border-border rounded-lg p-3 cursor-pointer active:cursor-grabbing shadow-sm hover:shadow hover:border-primary/50 transition-all"
                                        >
                                            <p className="font-semibold text-foreground text-sm">{task.title}</p>

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {/* Urgency */}
                                                {task.urgency && (
                                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${URGENCY_COLORS[task.urgency.name] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                        {task.urgency.name}
                                                    </span>
                                                )}

                                                {/* Size */}
                                                {task.size && (
                                                    <span className="flex items-center gap-0.5 text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                        <Zap className="h-2.5 w-2.5" />
                                                        {task.size.xp_points || 0}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                taskId={selectedTaskId}
                teamId={teamId}
                open={detailOpen}
                onClose={handleDrawerClose}
                canEdit={canEdit}
                quests={quests}
                sizes={sizes.map(s => ({ ...s, xp_points: s.xp_points || 0 }))}
                urgencies={urgencies.map(u => ({ ...u, color: u.color || '' }))}
                crew={crew}
            />
        </div>
    )
}
