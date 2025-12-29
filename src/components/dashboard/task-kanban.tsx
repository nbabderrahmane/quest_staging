'use client'

import { useState } from 'react'
import { Layers, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { TaskDetailDrawer } from '@/app/(dashboard)/admin/pipeline/task-detail-drawer'

// Types (reusing from quest-board-client but scoped locally or imported if we had a shared types file)
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
    assignee?: { first_name: string | null; last_name: string | null } | null
}

interface TaskKanbanProps {
    tasks: Task[]
    statuses: Status[]
    sizes: { id: string; name: string; xp_points?: number }[]
    urgencies: { id: string; name: string; color?: string }[]
    crew: { id: string; email: string; first_name: string | null; last_name: string | null }[]
    teamId: string
    canEdit: boolean
    userId: string
    // Callback for when a task is moved
    onTaskUpdate: (taskId: string, newStatusId: string) => Promise<void>
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

export function TaskKanban({ tasks: initialTasks, statuses, sizes, urgencies, crew, teamId, canEdit, onTaskUpdate }: TaskKanbanProps) {
    // We keep local state for optimistic updates
    const [tasks, setTasks] = useState<Task[]>(initialTasks)

    // Task Detail Drawer State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Group tasks by status
    const tasksByStatus: Record<string, Task[]> = {}
    for (const status of statuses) {
        tasksByStatus[status.id] = tasks.filter(t => t.status_id === status.id)
    }

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId)
    }

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault()
        const taskId = e.dataTransfer.getData('taskId')
        if (!taskId) return

        // Optimistic update
        const originalTasks = [...tasks]
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: statusId } : t))

        // Confetti Check
        const targetStatus = statuses.find(s => s.id === statusId)
        if (targetStatus?.category === 'done') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#ffffff', '#fbbf24']
            })
        }

        try {
            await onTaskUpdate(taskId, statusId)
        } catch (error) {
            console.error('Failed to update task status', error)
            // Revert on error
            setTasks(originalTasks)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId)
        setDetailOpen(true)
    }

    return (
        <div className="space-y-6">
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
                                        draggable={canEdit}
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onClick={() => handleTaskClick(task.id)}
                                        className={`bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow hover:border-blue-300 transition-all ${canEdit ? 'cursor-pointer active:cursor-grabbing' : ''}`}
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

                                        {/* Assignee Avatar/Name */}
                                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                                {task.assignee?.first_name ? task.assignee.first_name[0] : '?'}
                                            </div>
                                            <span>
                                                {task.assignee?.first_name ? `${task.assignee.first_name} ${task.assignee.last_name || ''}` : 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                taskId={selectedTaskId}
                teamId={teamId}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                canEdit={canEdit}
                quests={[]} // Not needed strictly for this view unless re-assigning quest
                sizes={sizes.map(s => ({ ...s, xp_points: s.xp_points || 0 }))}
                urgencies={urgencies.map(u => ({ ...u, color: u.color || '' }))}
                crew={crew}
            />
        </div>
    )
}
