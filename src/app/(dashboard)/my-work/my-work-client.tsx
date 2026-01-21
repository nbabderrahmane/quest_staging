'use client'

import { useState } from 'react'
import { Task } from '@/lib/types'
import { startTask, blockTask, unblockTask, completeTask } from './actions'
import { Clock, Play, Square, CheckCircle2, AlertTriangle, Zap, Target, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MyWorkClientProps {
    initialNow: Task[]
    initialNext: Task[]
    initialWaiting: Task[]
    teamId: string
    wipCount: number
    wipLimit: number
}

const QUADRANT_COLORS = {
    Q1: 'bg-red-500/10 text-red-500 border-red-500/20',
    Q2: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Q3: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Q4: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

const SECTION_ICONS = {
    now: <Zap className="h-5 w-5 text-orange-500" />,
    next: <ArrowRight className="h-5 w-5 text-blue-500" />,
    waiting: <Clock className="h-5 w-5 text-yellow-500" />,
}

export function MyWorkClient({ initialNow, initialNext, initialWaiting, teamId, wipCount, wipLimit }: MyWorkClientProps) {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleAction = async (action: Function, ...args: any[]) => {
        setIsPending(true)
        try {
            const res = await action(teamId, ...args)
            if (!res.success) {
                alert(res.error || 'Action failed')
            } else {
                router.refresh()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsPending(false)
        }
    }

    const TaskCard = ({ task, isNow = false }: { task: Task; isNow?: boolean }) => {
        const isSelected = task.status?.category === 'active'
        const canStart = wipCount < wipLimit && !isSelected && !task.needs_info

        return (
            <div className={`group relative bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all shadow-sm ${isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded border ${QUADRANT_COLORS[task.quadrant as keyof typeof QUADRANT_COLORS] || QUADRANT_COLORS.Q4}`}>
                            {task.quadrant}
                        </span>
                        {task.deadline_at && (
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${new Date(task.deadline_at) < new Date() ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                <Clock className="h-3 w-3" />
                                {new Date(task.deadline_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    {task.size && (
                        <span className="text-[10px] font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {task.size.xp_points} XP
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {task.title}
                </h3>

                <div className="flex flex-wrap gap-2 mb-4">
                    {task.project && (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 border border-border px-2 py-0.5 rounded">
                            {task.project.name}
                        </span>
                    )}
                    {task.department && (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 border border-border px-2 py-0.5 rounded">
                            {task.department.name}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                    {!task.needs_info ? (
                        <>
                            {isSelected ? (
                                <button
                                    onClick={() => handleAction(completeTask, task.id)}
                                    disabled={isPending}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest h-10 rounded-lg transition-all"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleAction(startTask, task.id)}
                                    disabled={isPending || !canStart}
                                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest h-10 rounded-lg transition-all ${canStart ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                                >
                                    <Play className="h-4 w-4" />
                                    Start Mission
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const reason = prompt('Why is this mission blocked?')
                                    if (reason) handleAction(blockTask, task.id, reason)
                                }}
                                disabled={isPending}
                                className="w-10 h-10 flex items-center justify-center border border-border hover:bg-muted text-muted-foreground rounded-lg transition-all"
                                title="Block Mission"
                            >
                                <Square className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => handleAction(unblockTask, task.id)}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-2 border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 text-xs font-black uppercase tracking-widest h-10 rounded-lg transition-all"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Unblock Mission
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* NOW Section */}
            <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        {SECTION_ICONS.now}
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest leading-none">Focus NOW</h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">High Impact Targets</p>
                    </div>
                </div>

                {wipCount >= wipLimit && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                        <p className="text-xs font-bold text-orange-800 dark:text-orange-400">
                            WIP limit reached ({wipLimit}). Termine ou bloque une mission avant d’en démarrer une autre.
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {initialNow.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center opacity-50">
                            <Target className="h-12 w-12 mb-4" />
                            <p className="text-sm font-bold uppercase">No Active Targets</p>
                        </div>
                    ) : (
                        initialNow.map(task => <TaskCard key={task.id} task={task} isNow />)
                    )}
                </div>
            </div>

            {/* NEXT Section */}
            <div className="lg:col-span-5 space-y-6 border-x border-border/40 px-0 lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        {SECTION_ICONS.next}
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest leading-none">Deploy NEXT</h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Strategic Reserve</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {initialNext.length === 0 ? (
                        <p className="text-sm text-center py-12 text-muted-foreground uppercase font-bold italic">Registry Empty</p>
                    ) : (
                        initialNext.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                </div>
            </div>

            {/* WAITING Section */}
            <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        {SECTION_ICONS.waiting}
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest leading-none">WAITING</h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Blocked Pipelines</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {initialWaiting.length === 0 ? (
                        <p className="text-sm text-center py-12 text-muted-foreground uppercase font-bold italic">No Blockers Detected</p>
                    ) : (
                        initialWaiting.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                </div>
            </div>
        </div>
    )
}
