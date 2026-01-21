'use client'

import { useState, useTransition } from 'react'
import { QuestPrepData, ProposedTask, finalizeQuestPrep } from './actions'
import { Zap, Target, Users, TrendingUp, CheckCircle2, XCircle, Loader2, Rocket } from 'lucide-react'

interface Props {
    initialData: QuestPrepData
    teamId: string
}

function QuadrantBadge({ quadrant }: { quadrant: string }) {
    const colors: Record<string, string> = {
        Q1: 'bg-red-500/20 text-red-400 border-red-500/30',
        Q2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        Q3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        Q4: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors[quadrant] || colors.Q4}`}>
            {quadrant}
        </span>
    )
}

export default function QuestPrepClient({ initialData, teamId }: Props) {
    const [tasks, setTasks] = useState<ProposedTask[]>(initialData.proposedTasks)
    const [selectedQuestId, setSelectedQuestId] = useState<string>(initialData.activeQuests[0]?.id || '')
    const [isPending, startTransition] = useTransition()
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const selectedTasks = tasks.filter(t => t.selected)
    const totalSelectedXp = selectedTasks.reduce((sum, t) => sum + t.xp, 0)
    const capacityPercent = initialData.teamCapacity.targetXp > 0
        ? Math.round((totalSelectedXp / initialData.teamCapacity.targetXp) * 100)
        : 0

    const toggleTask = (taskId: string) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, selected: !t.selected } : t))
    }

    const selectAll = () => setTasks(tasks.map(t => ({ ...t, selected: true })))
    const deselectAll = () => setTasks(tasks.map(t => ({ ...t, selected: false })))

    const handleFinalize = () => {
        if (!selectedQuestId || selectedTasks.length === 0) {
            setError('Select a quest and at least one task')
            return
        }

        startTransition(async () => {
            const result = await finalizeQuestPrep(teamId, selectedQuestId, selectedTasks.map(t => t.id))
            if (result.success) {
                setSuccess(`${selectedTasks.length} tasks assigned to quest!`)
                setTasks(tasks.filter(t => !t.selected))
            } else {
                setError(result.error || 'Failed to finalize')
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Quest Prep</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">Sprint Planning // Capacity-Based</p>
                </div>
            </div>

            {/* Capacity Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                        <Users className="h-3 w-3" />
                        Analysts
                    </div>
                    <div className="text-2xl font-bold text-foreground">{initialData.teamCapacity.analystCount}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                        <Zap className="h-3 w-3" />
                        Avg XP/Person
                    </div>
                    <div className="text-2xl font-bold text-foreground">{initialData.teamCapacity.avgXpPerPerson}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Historical Max
                    </div>
                    <div className="text-2xl font-bold text-foreground">{initialData.teamCapacity.historicalMaxXp}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                        <Target className="h-3 w-3" />
                        Target XP (110%)
                    </div>
                    <div className="text-2xl font-bold text-primary">{initialData.teamCapacity.targetXp}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-foreground">Sprint Capacity</span>
                    <span className="text-sm font-mono text-muted-foreground">
                        {totalSelectedXp} / {initialData.teamCapacity.targetXp} XP ({capacityPercent}%)
                    </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${capacityPercent > 120 ? 'bg-red-500' :
                                capacityPercent > 100 ? 'bg-yellow-500' : 'bg-primary'
                            }`}
                        style={{ width: `${Math.min(capacityPercent, 150)}%` }}
                    />
                </div>
                {capacityPercent > 120 && (
                    <p className="text-xs text-red-400 mt-1">⚠️ Over capacity - risk of burnout</p>
                )}
            </div>

            {/* Quest Selection */}
            <div className="bg-card border border-border rounded-lg p-4">
                <label className="text-sm font-bold text-foreground block mb-2">Assign to Quest</label>
                <select
                    value={selectedQuestId}
                    onChange={(e) => setSelectedQuestId(e.target.value)}
                    className="w-full md:w-auto px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                    <option value="">-- Select Quest --</option>
                    {initialData.activeQuests.map(q => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                </select>
            </div>

            {/* Task Selection */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-bold text-foreground">Proposed Tasks ({selectedTasks.length} selected)</h2>
                    <div className="flex gap-2">
                        <button onClick={selectAll} className="text-xs text-primary hover:underline">Select All</button>
                        <button onClick={deselectAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
                    </div>
                </div>

                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No backlog tasks available for sprint planning.
                    </div>
                ) : (
                    <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${task.selected ? 'bg-primary/10' : 'hover:bg-muted/50'
                                    }`}
                            >
                                <div className={`h-5 w-5 rounded border flex items-center justify-center ${task.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                                    }`}>
                                    {task.selected && <CheckCircle2 className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground truncate">{task.title}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        {task.department_name && <span>{task.department_name}</span>}
                                        {task.client_name && <span>• {task.client_name}</span>}
                                    </div>
                                </div>
                                <QuadrantBadge quadrant={task.quadrant} />
                                <span className="text-xs text-muted-foreground">{task.urgency_name}</span>
                                <span className="text-sm font-bold text-primary">{task.xp} XP</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={handleFinalize}
                    disabled={isPending || !selectedQuestId || selectedTasks.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold uppercase text-sm rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Rocket className="h-4 w-4" />
                    )}
                    Launch Sprint ({selectedTasks.length} tasks)
                </button>
            </div>

            {/* Feedback Toasts */}
            {error && (
                <div className="fixed bottom-4 right-4 z-50 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-sm underline">Dismiss</button>
                </div>
            )}
            {success && (
                <div className="fixed bottom-4 right-4 z-50 p-4 bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                    <button onClick={() => setSuccess(null)} className="ml-2 text-sm underline">Dismiss</button>
                </div>
            )}
        </div>
    )
}
