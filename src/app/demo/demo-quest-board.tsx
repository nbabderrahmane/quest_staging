'use client'

import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, Target, Layers, User, Zap, Plus } from 'lucide-react'
import { DEMO_TASKS } from '@/contexts/demo-context'

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
    client_id?: string | null
    size?: { id: string; name: string; xp_points?: number } | null
    urgency?: { id: string; name: string; color?: string } | null
    quest?: { id: string; name: string } | null
    client?: { id: string; name: string } | null
}

interface Boss {
    id: string
    name: string
    is_system: boolean
    image_healthy: string
    image_bloody: string
    image_dead: string
}

interface DemoQuestBoardProps {
    quests: Quest[]
    statuses: Status[]
    sizes: { id: string; name: string; xp_points?: number }[]
    urgencies: { id: string; name: string; color?: string }[]
    crew: { id: string; email: string; first_name: string | null; last_name: string | null }[]
    bosses: Boss[]
    clients: { id: string; name: string }[]
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

export function DemoQuestBoard({ quests, statuses, sizes: _sizes, urgencies: _urgencies, crew, bosses: _bosses, clients: _clients }: DemoQuestBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS as Task[])
    const [selectedQuestId, setSelectedQuestId] = useState<string>(quests[0]?.id || '')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAssignee, setSelectedAssignee] = useState<string>('all')

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
            if (!matchesSearch) return false
            if (selectedAssignee === 'all') return true
            if (selectedAssignee === 'unassigned') return !task.assigned_to
            return task.assigned_to === selectedAssignee
        })
    }, [tasks, searchQuery, selectedAssignee])

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {}
        for (const status of statuses) {
            grouped[status.id] = filteredTasks.filter(t => t.status_id === status.id)
        }
        return grouped
    }, [statuses, filteredTasks])

    // Demo drag handlers (just update local state)
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId)
    }

    const handleDrop = (e: React.DragEvent, statusId: string) => {
        e.preventDefault()
        const taskId = e.dataTransfer.getData('taskId')
        if (!taskId) return
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: statusId } : t))
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const currentQuest = quests.find(q => q.id === selectedQuestId)

    // Boss Battle Logic
    const totalXP = tasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)
    const completedXP = tasks
        .filter(t => {
            const status = statuses.find(s => s.id === t.status_id)
            return status?.category === 'done'
        })
        .reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)

    const bossMaxHP = totalXP > 0 ? totalXP : 100
    const bossCurrentHP = Math.max(0, bossMaxHP - completedXP)
    const bossHealthPercent = (bossCurrentHP / bossMaxHP) * 100

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
            {/* Boss Bar - Tour Target */}
            <div data-tour="boss-bar" className="bg-card border border-border rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Boss Avatar */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl">
                            🦖
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Godzilla</h2>
                            <p className="text-sm text-muted-foreground font-mono">Quest Boss • {currentQuest?.name}</p>
                        </div>
                    </div>

                    {/* Boss Health Bar */}
                    <div className="w-full md:w-80 space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase">
                            <span className="text-destructive">Boss HP</span>
                            <span className="text-muted-foreground">{bossCurrentHP} / {bossMaxHP} XP</span>
                        </div>
                        <div className="h-6 w-full bg-muted rounded-full overflow-hidden border-2 border-border">
                            <div
                                className={`h-full transition-all duration-500 ${bossHealthPercent < 25 ? 'bg-destructive animate-pulse' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                                style={{ width: `${bossHealthPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">Complete tasks to deal damage!</p>
                    </div>
                </div>
            </div>

            {/* Control Bar - Filters Tour Target */}
            <div data-tour="filters" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">Quest Board</h1>
                    <p className="text-muted-foreground font-mono text-xs md:text-sm mt-1">
                        {currentQuest ? currentQuest.name : 'Select a Quest'}
                    </p>
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

                    {/* Assignee Filter */}
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

                    {/* Quest Filter */}
                    <Select value={selectedQuestId} onValueChange={setSelectedQuestId}>
                        <SelectTrigger className="w-full md:w-[220px] bg-background border-border text-foreground">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <SelectValue placeholder="Select Quest" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {quests.map(quest => (
                                <SelectItem key={quest.id} value={quest.id}>
                                    {quest.name} {quest.is_active && '(Active)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Kanban Board - Tour Target */}
            <div data-tour="kanban-board" className="flex gap-4 overflow-x-auto pb-4">
                {statuses.map((status, idx) => (
                    <div
                        key={status.id}
                        data-tour={idx === 0 ? "status-column" : undefined}
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
                                {status.category === 'backlog' && (
                                    <button
                                        data-tour="quick-create"
                                        className="p-1 hover:bg-muted rounded text-primary transition-colors"
                                        title="Quick Add"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                                {tasksByStatus[status.id]?.length || 0}
                            </span>
                        </div>

                        {/* Tasks */}
                        <div className="p-3 space-y-3 min-h-[200px] max-h-[500px] overflow-y-auto">
                            {tasksByStatus[status.id]?.length === 0 ? (
                                <p className="text-muted-foreground text-xs text-center py-8">No tasks</p>
                            ) : (
                                tasksByStatus[status.id]?.map((task, taskIdx) => (
                                    <div
                                        key={task.id}
                                        data-tour={idx === 1 && taskIdx === 0 ? "task-card" : undefined}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
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
                                                    {task.size.xp_points || 0} XP
                                                </span>
                                            )}

                                            {/* Client */}
                                            {task.client && (
                                                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {task.client.name}
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
        </div>
    )
}
