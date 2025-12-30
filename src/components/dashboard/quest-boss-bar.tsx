'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getActiveQuestProgress } from '@/app/(dashboard)/admin/quests/actions'
import { Target, Trophy, Flame } from 'lucide-react'

export function QuestBossBar({ teamId }: { teamId: string }) {
    const [progress, setProgress] = useState<{ name: string, totalXP: number, currentXP: number, percentage: number } | null>(null)
    const [loading, setLoading] = useState(true)
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        async function load() {
            console.log('🔥 BossBar: Fetching progress for team', teamId)
            try {
                const data = await getActiveQuestProgress(teamId)
                if (data) {
                    console.log('🔥 BossBar: Data received', data)
                    setProgress(data)
                } else {
                    console.log('🔥 BossBar: No data returned')
                }
            } catch (err) {
                console.error('🔥 BossBar: Fetch error', err)
            } finally {
                setLoading(false)
            }
        }
        load()

        // Realtime Subscription
        const channel = supabase
            .channel(`boss-bar-${teamId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `team_id=eq.${teamId}`
                },
                () => {
                    console.log('🔥 BossBar: Task update detected, refreshing...')
                    load()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [teamId, supabase])

    if (loading) {
        return (
            <div className="h-16 bg-slate-900 border-b-4 border-slate-800 flex items-center justify-center z-[60] relative">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase animate-pulse">
                    <span>Initializing Command...</span>
                </div>
            </div>
        )
    }

    if (!progress) {
        return (
            <div className="bg-slate-900 border-b-4 border-slate-800 relative text-white shadow-lg z-[60] h-16 flex items-center justify-center">
                <div className="text-slate-500 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                    <div className="h-2 w-2 bg-slate-700 rounded-full" />
                    No Active Operation
                </div>
            </div>
        )
    }

    // Determine color based on progress (Red -> Orange -> Green)
    const getColor = (p: number) => {
        if (p < 30) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
        if (p < 70) return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]'
        return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
    }

    const barColor = getColor(progress.percentage)

    return (
        <div className="bg-slate-900 border-b-4 border-slate-800 relative overflow-hidden text-white shadow-lg z-[60]">
            {/* Background Texture/Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-500 via-slate-900 to-black" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 relative flex items-center justify-between gap-4 md:gap-8 h-16">

                {/* Left: Quest Name */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0 max-w-[40%] md:max-w-none">
                    <div className="p-1.5 bg-slate-800 rounded border border-slate-700 shrink-0">
                        <Target className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1 hidden sm:block">Active Operation</div>
                        <h3 className="font-black text-sm md:text-lg uppercase tracking-tight truncate leading-none text-white drop-shadow-md">
                            {progress.name}
                        </h3>
                    </div>
                </div>

                {/* Center: The Boss Bar */}
                <div className="flex-1 max-w-2xl flex flex-col justify-center">
                    <div className="flex justify-between text-[10px] md:text-xs font-mono font-bold mb-1 px-1">
                        <span className="text-blue-400 flex items-center gap-1">
                            <Flame className="h-3 w-3" /> {progress.currentXP} <span className="hidden sm:inline">XP</span>
                        </span>
                        <span className="text-slate-500 text-center mx-2">
                            {progress.percentage}% <span className="hidden sm:inline">COMPLETE</span>
                        </span>
                        <span className="text-slate-400 text-right">
                            <span className="hidden sm:inline">Target: </span>{progress.totalXP} <span className="hidden sm:inline">XP</span>
                        </span>
                    </div>
                    <div className="h-3 md:h-4 bg-slate-800 rounded-sm border border-slate-700 relative overflow-hidden">
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
