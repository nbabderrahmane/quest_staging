'use client'

import { useState } from 'react'
import { Task } from '@/lib/types'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface CalendarViewProps {
    tasks: Task[]
    type: 'personal' | 'quest'
    questStartDate?: string | Date
    questEndDate?: string | Date
    onTaskClick?: (taskId: string) => void
}

type ViewMode = '3days' | '7days' | 'month'

export function CalendarView({ tasks, type, questStartDate, questEndDate, onTaskClick }: CalendarViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('3days')
    const [currentDate, setCurrentDate] = useState(new Date())

    // Helper to format date key YYYY-MM-DD
    const getDateKey = (date: Date) => {
        return date.toISOString().split('T')[0]
    }

    // Helper: Get days to display
    const getDays = () => {
        const days = []
        if (type === 'quest' && questStartDate && questEndDate) {
            const start = new Date(questStartDate)
            const end = new Date(questEndDate)
            const curr = new Date(start)
            while (curr <= end) {
                days.push(new Date(curr))
                curr.setDate(curr.getDate() + 1)
            }
        } else {
            // Personal View
            // Personal View Logic
            if (viewMode === 'month') {
                const year = currentDate.getFullYear()
                const month = currentDate.getMonth()
                const lastDay = new Date(year, month + 1, 0)

                // Fill array with all days in month
                for (let d = 1; d <= lastDay.getDate(); d++) {
                    days.push(new Date(year, month, d))
                }
            } else {
                // 3 or 7 days
                const count = viewMode === '3days' ? 3 : 7
                for (let i = 0; i < count; i++) {
                    const d = new Date(currentDate)
                    d.setDate(d.getDate() + i)
                    days.push(d)
                }
            }
        }
        return days
    }

    const daysToDisplay = getDays()

    // Group tasks by deadline (or created_at if deadline missing? User request implies "upcoming tasks", usually deadline)
    // For Quest Board, it might be deadline within sprint. 
    // Let's map by `deadline_at`. If no deadline, maybe put in "Backlog / No Date" bin? 
    // User asked "see upcoming tasks", so deadline is key.
    const tasksByDate: Record<string, Task[]> = {}
    tasks.forEach(t => {
        if (t.deadline_at) {
            const dateKey = getDateKey(new Date(t.deadline_at))
            if (!tasksByDate[dateKey]) tasksByDate[dateKey] = []
            tasksByDate[dateKey].push(t)
        }
    })

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate)
        if (viewMode === '3days') newDate.setDate(newDate.getDate() + (direction === 'next' ? 3 : -3))
        else if (viewMode === '7days') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        else newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        setCurrentDate(newDate)
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    // Month Grid Render Helper
    const renderMonthGrid = () => {
        // Simple grid: 7 cols (Mon-Sun).
        // need to pad start
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)

        // 0=Sun, 1=Mon. We want Mon=0, Sun=6
        let startOffset = firstDay.getDay() - 1
        if (startOffset === -1) startOffset = 6

        const blanks = Array(startOffset).fill(null)
        const days = daysToDisplay

        return (
            <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-muted-foreground uppercase py-2">{d}</div>
                ))}
                {blanks.map((_, i) => <div key={`blank-${i}`} className="min-h-[100px] bg-muted/5 border border-transparent rounded-lg" />)}
                {days.map(date => {
                    const dateKey = getDateKey(date)
                    const dayTasks = tasksByDate[dateKey] || []
                    const today = isToday(date)

                    return (
                        <div key={dateKey} className={`min-h-[100px] bg-card border ${today ? 'border-primary' : 'border-border'} rounded-lg p-2 transition-colors hover:border-primary/50 flex flex-col gap-2`}>
                            <div className={`text-right text-sm font-mono ${today ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                {date.getDate()}
                            </div>
                            <div className="flex-1 space-y-1">
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick?.(task.id)}
                                        className="text-[10px] p-1.5 rounded bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/30 cursor-pointer truncate"
                                        title={task.title}
                                    >
                                        <div className="flex items-center gap-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${task.status?.category === 'done' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                            <span className={task.status?.category === 'done' ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-2 rounded-xl">
                <div className="flex items-center gap-2">
                    {type === 'personal' && (
                        <div className="flex p-1 bg-muted rounded-lg">
                            {(['3days', '7days', 'month'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${viewMode === mode ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {mode === '3days' ? '3 Days' : mode === '7days' ? '7 Days' : 'Month'}
                                </button>
                            ))}
                        </div>
                    )}
                    {type === 'quest' && (
                        <div className="px-3 py-1.5 text-sm font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span>Sprint Timeline</span>
                            {questStartDate && questEndDate && (
                                <span className="text-muted-foreground font-mono text-xs ml-2">
                                    {new Date(questStartDate).toLocaleDateString()} - {new Date(questEndDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {type === 'personal' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-mono font-bold w-32 text-center">
                            {viewMode === 'month'
                                ? currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                                : currentDate.toLocaleDateString()
                            }
                        </span>
                        <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-bold uppercase text-primary hover:underline px-2">
                            Today
                        </button>
                        <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Calendar Body */}
            {(viewMode === 'month' && type === 'personal') ? (
                renderMonthGrid()
            ) : (
                // Horizontal Scroll / Column View for 3/7 days OR Quest View (usually < 30 days)
                // Responsive Wrapping Grid - Wide Cards Priority
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 min-[2200px]:grid-cols-4 gap-6 pb-8">
                    {daysToDisplay.map(date => {
                        const dateKey = getDateKey(date)
                        const dayTasks = tasksByDate[dateKey] || []
                        const today = isToday(date)
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0)) && !today

                        return (
                            <div
                                key={dateKey}
                                className={`min-w-[500px] flex-1 flex flex-col bg-card/60 border ${today ? 'border-primary ring-1 ring-primary/20' : 'border-border/60'} rounded-xl overflow-hidden shadow-sm backdrop-blur-sm`}
                            >
                                {/* Date Header */}
                                <div className={`px-4 py-3 border-b ${today ? 'bg-primary/10 border-primary/20' : 'bg-muted/30 border-border/40'} flex items-center justify-between`}>
                                    <span className={`text-sm font-black uppercase tracking-widest ${today ? 'text-primary' : 'text-foreground'}`}>
                                        {date.toLocaleDateString(undefined, { weekday: 'short' })}
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className={`text-2xl font-black leading-none ${today ? 'text-primary' : 'text-foreground'}`}>{date.getDate()}</span>
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className={`flex-1 p-3 space-y-3 ${isPast ? 'bg-muted/10' : ''} min-h-[400px]`}>
                                    {dayTasks.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 space-y-2 pb-12">
                                            <div className="w-16 h-1 bg-current rounded-full opacity-20" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">No Deadlines</span>
                                        </div>
                                    ) : (
                                        dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => onTaskClick?.(task.id)}
                                                className={`group relative p-4 rounded-lg border transition-all cursor-pointer shadow-sm hover:shadow-md w-full max-w-full
                                                    ${task.status?.category === 'done'
                                                        ? 'bg-muted/40 border-transparent opacity-60 hover:opacity-100 grayscale'
                                                        : 'bg-popover border-border hover:border-primary/50'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${task.urgency?.name === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        task.urgency?.name === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                            'bg-secondary text-secondary-foreground border-border'
                                                        }`}>
                                                        {task.urgency?.name || 'Normal'}
                                                    </span>
                                                    {task.status?.category === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                </div>
                                                <p className={`text-sm font-bold leading-tight line-clamp-2 mb-3 break-words ${task.status?.category === 'done' ? 'line-through decoration-muted-foreground/50' : 'group-hover:text-primary transition-colors'}`}>
                                                    {task.title}
                                                </p>
                                                {task.size && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-purple-500/50" />
                                                            {task.size.xp_points} XP
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
