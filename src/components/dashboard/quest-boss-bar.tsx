'use client'

import { useEffect, useState } from 'react'
import { getActiveQuestProgress } from '@/app/(dashboard)/admin/quests/actions'
import { Target, Trophy, Flame } from 'lucide-react'

export function QuestBossBar({ teamId }: { teamId: string }) {
    const [progress, setProgress] = useState<{ name: string, totalXP: number, currentXP: number, percentage: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            console.log('🔥 BossBar: Fetching progress for team', teamId)
            try {
                const data = await getActiveQuestProgress(teamId)
                console.log('🔥 BossBar: Data received', data)
                if (data) {
                    setProgress(data)
                } else {
                    console.log('🔥 BossBar: No active quest data found')
                }
            } catch (err) {
                console.error('🔥 BossBar: Fetch error', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [teamId])

    if (loading) return null // Wait for load
    if (!progress) {
        // If we have no progress, don't render. 
        // But if it "flashes", it implies we HAD progress then lost it, OR we rendered something else?
        // Let's add a debug indicator if in dev
        console.log('🔥 BossBar: Rendering NULL because no progress')
        return null
    }

    // Determine color based on progress (Red -> Orange -> Green)
    const getColor = (p: number) => {
        if (p < 30) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
        if (p < 70) return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]'
        return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
    }

    const barColor = getColor(progress.percentage)

    return (
        <div className="bg-slate-900 border-b-4 border-slate-800 relative overflow-hidden text-white shadow-lg z-30">
            {/* Background Texture/Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-500 via-slate-900 to-black" />

            <div className="max-w-7xl mx-auto px-8 py-3 relative flex items-center justify-between gap-8 h-16">

                {/* Left: Quest Name */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-slate-800 rounded border border-slate-700">
                        <Target className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Active Operation</div>
                        <h3 className="font-black text-lg uppercase tracking-tight truncate leading-none text-white drop-shadow-md">
                            {progress.name}
                        </h3>
                    </div>
                </div>

                {/* Center: The Boss Bar */}
                <div className="flex-1 max-w-2xl flex flex-col justify-center">
                    <div className="flex justify-between text-xs font-mono font-bold mb-1 px-1">
                        <span className="text-blue-400 flex items-center gap-1">
                            <Flame className="h-3 w-3" /> {progress.currentXP} XP
                        </span>
                        <span className="text-slate-500">
                            {progress.percentage}% COMPLETE
                        </span>
                        <span className="text-slate-400">
                            Target: {progress.totalXP} XP
                        </span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-sm border border-slate-700 relative overflow-hidden">
                        {/* Bar Fill */}
                        <div
                            className={`h-full transition-all duration-1000 ease-out relative ${barColor}`}
                            style={{ width: `${progress.percentage}%` }}
                        >
                            {/* Shine Effect */}
                            <div className="absolute top-0 right-0 bottom-0 width-full bg-gradient-to-l from-white/20 to-transparent w-full" />
                        </div>
                    </div>
                </div>

                {/* Right: Rank/Status Badge (Static for now or derived) */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded border border-slate-700/50">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-bold uppercase text-yellow-500 tracking-wider">
                        {progress.percentage >= 100 ? 'VICTORY IMMINENT' : 'IN PROGRESS'}
                    </span>
                </div>

            </div>
        </div>
    )
}
