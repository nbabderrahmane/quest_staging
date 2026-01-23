'use client'

import { Task } from "@/lib/types"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

interface TaskCardProps {
    task: Task
}

export function TaskCard({ task }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: {
            task
        }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    }

    // Determine urgency color for the strip
    const urgencyColor = task.urgency?.color || 'transparent'

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "group relative bg-card text-card-foreground border border-border p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing rounded-none",
                "before:absolute before:inset-y-0 before:left-0 before:w-1",
                isDragging ? "shadow-xl z-50 ring-2 ring-primary/20" : ""
            )}
        >
            {/* Urgency Strip */}
            <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: urgencyColor }}
            />

            <div className="pl-3 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <h4 className="text-sm font-bold leading-tight">{task.title}</h4>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                        {task.size && (
                            <span className="bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-foreground inline-block">
                                {task.size.name} ({task.xp_points} XP)
                            </span>
                        )}
                        {task.sub_team && (
                            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-[100px]">
                                {task.sub_team.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    )
}
