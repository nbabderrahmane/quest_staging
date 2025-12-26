'use client'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useState, useOptimistic, startTransition } from "react"
import { Quest, Status, Task, Size, Urgency } from "@/lib/types"
import { BoardColumn } from "./board-column"
import { TaskCard } from "./task-card"
import { updateTaskStatus } from "@/app/(dashboard)/quest-board/actions"
import { CreateTaskDialog } from "./create-task-dialog"

interface QuestBoardProps {
    quest: Quest
    initialTasks: Task[]
    statuses: Status[]
    sizes: Size[]
    urgencies: Urgency[]
    teamId: string
}

export function QuestBoard({ quest, initialTasks, statuses, sizes, urgencies, teamId }: QuestBoardProps) {
    const [tasks, setTasks] = useState(initialTasks)
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

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

        // Optimistic Update
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, status_id: newStatusId } : t
        )
        setTasks(updatedTasks)

        // Server Action
        startTransition(() => {
            updateTaskStatus(taskId, newStatusId)
        })
    }

    const activeTask = tasks.find(t => t.id === activeId)

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
                        <div className="text-xs font-mono text-muted-foreground">
                            PROTOCOL: <span className="text-primary font-bold">{quest.name}</span>
                        </div>
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

                {/* Columns */}
                <div className="flex h-full gap-4 overflow-x-auto pb-4">
                    {statuses.map(status => (
                        <BoardColumn
                            key={status.id}
                            status={status}
                            tasks={tasks.filter(t => t.status_id === status.id)}
                        />
                    ))}
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} /> : null}
                </DragOverlay>

                {/* Floating Action Button */}
                <CreateTaskDialog
                    questId={quest.id}
                    teamId={teamId}
                    sizes={sizes}
                    urgencies={urgencies}
                    statuses={statuses}
                />
            </div>
        </DndContext>
    )
}
