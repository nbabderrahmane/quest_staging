'use client'

import { useState } from 'react'
import { initializeTeamConfiguration, signOut } from '@/app/teams/actions'
import { WindowCard } from '@/components/ui/window-card'
import { Terminal, LogOut, Check, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface CockpitInitializerProps {
    teamId: string
    teamName: string
    userRole: string
}

export function CockpitInitializer({ teamId, teamName, userRole }: CockpitInitializerProps) {
    const [isLoading, setIsLoading] = useState(false)
    const canInitialize = ['owner', 'manager', 'admin'].includes(userRole)

    // Default Configuration State
    const [statuses, setStatuses] = useState([
        { name: 'Backlog', category: 'backlog', sort_order: 0 },
        { name: 'To Do', category: 'active', sort_order: 10 },
        { name: 'In Progress', category: 'active', sort_order: 20 },
        { name: 'Done', category: 'done', sort_order: 30 },
    ])

    const [sizes, setSizes] = useState([
        { name: 'Tiny', xp_points: 10, sort_order: 0 },
        { name: 'Medium', xp_points: 30, sort_order: 10 },
        { name: 'Large', xp_points: 100, sort_order: 20 },
    ])

    const [urgencies, setUrgencies] = useState([
        { name: 'Normal', weight: 10, color: 'blue' },
        { name: 'High', weight: 50, color: 'orange' },
        { name: 'CRITICAL', weight: 100, color: 'red' },
    ])

    const handleInitialize = async () => {
        setIsLoading(true)
        const config = { statuses, sizes, urgencies }
        await initializeTeamConfiguration(teamId, config)
    }

    // Helper to update state items safely
    const updateItem = (setter: any, list: any[], index: number, field: string, value: any) => {
        const newList = [...list]
        newList[index] = { ...newList[index], [field]: value }
        setter(newList)
    }

    return (
        <div className="flex bg-black min-h-screen w-full items-center justify-center p-4 font-mono">
            <div className="max-w-2xl w-full flex flex-col gap-8">
                <WindowCard title="System Calibration">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/50">
                                <Terminal className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-red-400 font-bold uppercase tracking-widest text-xs">
                                    Uncalibrated Sector: {teamName}
                                </p>
                                <p className="text-lg font-bold text-white uppercase tracking-tight">
                                    Confirm Mission Protocols
                                </p>
                            </div>
                        </div>

                        {/* Configuration Grid */}
                        {!canInitialize ? (
                            <div className="border border-yellow-500/30 bg-yellow-500/10 p-4 rounded text-center">
                                <p className="text-yellow-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                                    Waiting for Commander Authorization...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg flex items-center justify-between">
                                    <div>
                                        <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-1">Standard Protocols Available</h4>
                                        <p className="text-slate-400 text-xs text-left max-w-sm">
                                            Initialize with recommended defaults (Agile Workflow, XP System, Standard Urgency).
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleInitialize}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                                    >
                                        Execute Quick Start
                                    </button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-black px-2 text-slate-500">Or Customize Protocols</span>
                                    </div>
                                </div>

                                <div className="grid gap-8 opacity-75 hover:opacity-100 transition-opacity">
                                    {/* Statuses Config */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground font-bold tracking-wider">
                                            <ChevronRight className="h-3 w-3 text-primary" /> Workflow Statuses
                                        </div>
                                        <div className="grid gap-2">
                                            {statuses.map((s, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={s.name}
                                                        onChange={(e) => updateItem(setStatuses, statuses, i, 'name', e.target.value)}
                                                        className="h-8 bg-black/40 border-white/10 text-xs font-mono"
                                                    />
                                                    <div className="w-24 flex items-center justify-center text-[10px] bg-white/5 rounded border border-white/5 text-muted-foreground uppercase">
                                                        {s.category}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sizes Config */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground font-bold tracking-wider">
                                            <ChevronRight className="h-3 w-3 text-primary" /> XP Matrix
                                        </div>
                                        <div className="grid gap-2">
                                            {sizes.map((s, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={s.name}
                                                        onChange={(e) => updateItem(setSizes, sizes, i, 'name', e.target.value)}
                                                        className="h-8 bg-black/40 border-white/10 text-xs font-mono"
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={s.xp_points}
                                                        onChange={(e) => updateItem(setSizes, sizes, i, 'xp_points', parseInt(e.target.value))}
                                                        className="h-8 w-24 bg-black/40 border-white/10 text-xs font-mono text-center"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Urgencies Config */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground font-bold tracking-wider">
                                            <ChevronRight className="h-3 w-3 text-primary" /> Urgency Levels
                                        </div>
                                        <div className="grid gap-2">
                                            {urgencies.map((u, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={u.name}
                                                        onChange={(e) => updateItem(setUrgencies, urgencies, i, 'name', e.target.value)}
                                                        className="h-8 bg-black/40 border-white/10 text-xs font-mono"
                                                        style={{ color: u.color }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleInitialize}
                                        disabled={isLoading}
                                        className="w-full py-3 border border-white/20 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                                    >
                                        Save Custom Configuration
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </WindowCard>

                <div className="flex justify-center">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 text-xs font-mono text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                        <LogOut className="h-3 w-3" />
                        [ Emergency Eject ]
                    </button>
                </div>
            </div>
        </div>
    )
}
