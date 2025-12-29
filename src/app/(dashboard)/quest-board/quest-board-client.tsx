'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, Target, Layers, User, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { getTasks, updateTaskStatus } from './actions'
import { TaskDetailDrawer } from '@/app/(dashboard)/admin/pipeline/task-detail-drawer'

interface Quest {
    id: string
    name: string
    is_active?: boolean
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
}

const URGENCY_COLORS: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
}

const STATUS_BG: Record<string, string> = {
    'Backlog': 'bg-slate-100',
    'In Progress': 'bg-blue-50',
    'Review': 'bg-purple-50',
    'Done': 'bg-green-50',
}

export function QuestBoardClient({ quests, statuses, sizes, urgencies, teamId, canEdit, crew, userId, userRole }: QuestBoardClientProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedQuestId, setSelectedQuestId] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const isAnalyst = userRole === 'analyst'

    // Task Detail Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Load tasks when quest changes
    useEffect(() => {
        async function loadTasks() {
            if (!selectedQuestId) {
                setTasks([])
                return
            }
            setIsLoading(true)
            const taskData = await getTasks(selectedQuestId)
            setTasks(taskData || [])
            setIsLoading(false)
        }
        loadTasks()
    }, [selectedQuestId])

    // Set first active quest as default
    useEffect(() => {
        const activeQuest = quests.find(q => q.is_active)
        if (activeQuest && !selectedQuestId) {
            setSelectedQuestId(activeQuest.id)
        } else if (quests.length > 0 && !selectedQuestId) {
            setSelectedQuestId(quests[0].id)
        }
    }, [quests, selectedQuestId])

    const [selectedAssignee, setSelectedAssignee] = useState<string>('all')

    // Filter tasks by search, analyst role, and assignee
    const filteredTasks = tasks.filter(task => {
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

    // Group tasks by status
    const tasksByStatus: Record<string, Task[]> = {}
    for (const status of statuses) {
        tasksByStatus[status.id] = filteredTasks.filter(t => t.status_id === status.id)
    }

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
            await updateTaskStatus(taskId, statusId)
        } catch (error) {
            console.error('Failed to update task status', error)
            // Revert on error
            const taskData = await getTasks(selectedQuestId)
            setTasks(taskData || [])
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const currentQuest = quests.find(q => q.id === selectedQuestId)

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId)
        setDetailOpen(true)
    }

    const handleDrawerClose = async () => {
        setDetailOpen(false)
        setSelectedTaskId(null)
        // Refresh tasks after drawer closes
        if (selectedQuestId) {
            const taskData = await getTasks(selectedQuestId)
            setTasks(taskData || [])
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-6">
            {/* Control Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Quest Board</h1>
                    <p className="text-slate-500 font-mono text-sm mt-1">
                        {currentQuest ? currentQuest.name : 'Select a Quest'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64 bg-white border-slate-300 text-slate-900"
                        />
                    </div>

                    {/* Assignee Filter - Hidden for Analysts */}
                    {!isAnalyst && (
                        <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                            <SelectTrigger className="w-[180px] bg-white border-slate-300 text-slate-900">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-500" />
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
                        <SelectTrigger className="w-[220px] bg-white border-slate-300 text-slate-900">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-blue-600" />
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
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No Quest Selected</h3>
                    <p className="text-slate-500 text-sm mt-1">
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
                            className={`flex-shrink-0 w-80 ${STATUS_BG[status.name] || 'bg-slate-50'} border border-slate-200 rounded-lg`}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                                        {status.name}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-slate-500">
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
                                            className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer active:cursor-grabbing shadow-sm hover:shadow hover:border-blue-300 transition-all"
                                        >
                                            <p className="font-semibold text-slate-900 text-sm">{task.title}</p>

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
