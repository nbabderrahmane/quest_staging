'use client'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import confetti from 'canvas-confetti'
import { useState, startTransition, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Quest, Status, Task, Size, Urgency } from "@/lib/types"
import { BoardColumn } from "./board-column"
import { TaskCard } from "./task-card"
import { updateTaskStatus } from "@/app/(dashboard)/quest-board/actions"
import { CreateTaskDialog } from "./create-task-dialog"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { logger } from "@/lib/logger"

interface CrewMember {
    user_id: string
    first_name: string | null
    last_name: string | null
}

interface QuestBoardProps {
    quest: Quest
    initialTasks: Task[]
    statuses: Status[]
    sizes: Size[]
    urgencies: Urgency[]
    teamId: string
    crew: CrewMember[]
    canEdit: boolean
    userId: string
    userRole: string
}

export function QuestBoard({ quest, initialTasks, statuses, sizes, urgencies, teamId, crew, userRole }: QuestBoardProps) {
    const [tasks, setTasks] = useState(initialTasks)
    const [view, setView] = useState<'kanban' | 'calendar'>('kanban')
    const [activeId, setActiveId] = useState<string | null>(null)

    // URL State Management for Dialogs
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const isCreateOpen = searchParams?.get('action') === 'create-task'
    const newTaskStatusId = searchParams?.get('statusId') || undefined

    const setIsCreateOpen = useCallback((open: boolean) => {
        const params = new URLSearchParams(searchParams?.toString())
        if (open) {
            params.set('action', 'create-task')
        } else {
            params.delete('action')
            params.delete('statusId')
        }
        router.replace(`${pathname}?${params.toString()}`)
    }, [pathname, router, searchParams])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const [selectedAssignee, setSelectedAssignee] = useState<string>('all')

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const taskId = active.id as string
        const newStatusId = over.id as string

        const currentTask = tasks.find(t => t.id === taskId)
        if (!currentTask || currentTask.status_id === newStatusId) return

        // Check if target is 'done'
        const targetStatus = statuses.find(s => s.id === newStatusId)

        logger.debug('Confetti Debug Check', {
            taskId,
            newStatusId,
            targetStatusName: targetStatus?.name,
            targetCategory: targetStatus?.category
        })

        if (targetStatus?.category === 'done') {
            logger.info('TRIGGERING CONFETTI', { taskId, teamId })
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#ffffff', '#fbbf24'] // Green, White, Gold
            })
        }

        // Optimistic Update
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, status_id: newStatusId } : t
        )
        setTasks(updatedTasks)

        // Server Action
        startTransition(() => {
            updateTaskStatus(taskId, newStatusId, teamId)
        })
    }

    const activeTask = tasks.find(t => t.id === activeId)

    // Filter Tasks
    const filteredTasks = tasks.filter(t => {
        if (selectedAssignee === 'all') return true
        if (selectedAssignee === 'unassigned') return !t.assigned_to
        return t.assigned_to === selectedAssignee
    })

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="relative h-full flex flex-col">
                {/* Board Header / Controls */}
                <div className="flex items-center justify-between mb-4 bg-muted/5 p-4 border border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setView('kanban')}
                                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${view === 'kanban' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Kanban
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${view === 'calendar' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Calendar
                            </button>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mr-2 flex items-center gap-2">
                            PROTOCOL: <span className="text-primary font-bold">{quest.name}</span>
                            {quest.sub_team && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                    {quest.sub_team.name}
                                </span>
                            )}
                        </div>

                        {/* Assignee Filter - Hidden for Analysts */}
                        {userRole !== 'analyst' && (
                            <div className="relative">
                                <select
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    className="bg-background text-xs font-bold border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="all">ALL CREW</option>
                                    <option value="unassigned">UNASSIGNED</option>
                                    <hr />
                                    {(crew || []).map((member) => (
                                        <option key={member.user_id} value={member.user_id}>
                                            {member.first_name} {member.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        {/* XP Metrics */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">XP Status</span>
                                <span className="font-mono text-sm font-bold">
                                    <span className="text-primary">
                                        {tasks.filter(t => statuses.find(s => s.id === t.status_id)?.category === 'done').reduce((acc, t) => acc + t.xp_points, 0)}
                                    </span>
                                    <span className="text-muted-foreground mx-1">/</span>
                                    {tasks.reduce((acc, t) => acc + t.xp_points, 0)}
                                </span>
                            </div>
                            {/* Mini Progress Bar */}
                            <div className="h-8 w-1 bg-border relative">
                                <div
                                    className="absolute bottom-0 left-0 w-full bg-primary transition-all duration-500 ease-out"
                                    style={{
                                        height: `${Math.min(100, (tasks.filter(t => statuses.find(s => s.id === t.status_id)?.category === 'done').reduce((acc, t) => acc + t.xp_points, 0) / Math.max(1, tasks.reduce((acc, t) => acc + t.xp_points, 0))) * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {view === 'calendar' ? (
                    <div className="h-full overflow-hidden animate-in fade-in duration-300">
                        <CalendarView
                            tasks={filteredTasks}
                            type="quest"
                            questStartDate={quest.start_date || undefined}
                            questEndDate={quest.end_date || undefined}
                        />
                    </div>
                ) : (
                    <>
                        {/* Columns */}
                        <div className="flex h-full gap-4 overflow-x-auto pb-4">
                            {statuses.map(status => (
                                <BoardColumn
                                    key={status.id}
                                    status={status}
                                    tasks={filteredTasks.filter(t => t.status_id === status.id)}
                                    onAddTask={status.category === 'backlog' ? () => {
                                        const params = new URLSearchParams(searchParams?.toString())
                                        params.set('action', 'create-task')
                                        params.set('statusId', status.id)
                                        router.replace(`${pathname}?${params.toString()}`)
                                    } : undefined}
                                />
                            ))}
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeTask ? <TaskCard task={activeTask} /> : null}
                        </DragOverlay>

                        {/* Create Task Dialog (Floating + Controlled) */}
                        <CreateTaskDialog
                            questId={quest.id}
                            teamId={teamId}
                            sizes={sizes}
                            urgencies={urgencies}
                            statuses={statuses}
                            open={isCreateOpen}
                            onOpenChange={setIsCreateOpen}
                            defaultStatusId={newTaskStatusId}
                        />
                    </>
                )}
            </div>
        </DndContext>
    )
}
