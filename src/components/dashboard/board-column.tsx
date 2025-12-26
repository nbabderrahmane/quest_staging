'use client'

import { Status, Task } from "@/lib/types"
import { useDroppable } from "@dnd-kit/core"
import { TaskCard } from "./task-card"
import { cn } from "@/lib/utils"

interface BoardColumnProps {
    status: Status
    tasks: Task[]
}

export function BoardColumn({ status, tasks }: BoardColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status.id,
        data: { status }
    })

    return (
        <div className="flex h-full min-w-[280px] w-full flex-col rounded-none bg-secondary/10 border border-border/50">
            {/* Header */}
            <div className={cn(
                "p-3 border-b border-border/50 flex items-center justify-between",
                status.category === 'done' ? "bg-green-500/10" : ""
            )}>
                <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">{status.name}</h3>
                <span className="text-[10px] font-mono opacity-50 bg-secondary/20 px-1.5 py-0.5 rounded-sm">{tasks.length}</span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 p-2 space-y-2 transition-colors",
                    isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                )}
            >
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    )
}
