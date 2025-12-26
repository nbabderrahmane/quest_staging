'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLeaderboard, LeaderboardEntry } from './actions'
import { Crown, Medal, TrendingUp, Shield, Star, Users, Target } from 'lucide-react'

// Rank Configuration
const RANKS = [
    { name: 'Legendary Operative', minXP: 1501, color: 'text-yellow-600 bg-yellow-100 border-yellow-200', icon: Crown },
    { name: 'Vanguard', minXP: 501, color: 'text-blue-600 bg-blue-100 border-blue-200', icon: Shield },
    { name: 'Recruit', minXP: 0, color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Star },
]

export default function AnalyticsPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Metrics
    const [totalXP, setTotalXP] = useState(0)
    const [totalMissions, setTotalMissions] = useState(0)
    const [activeAgents, setActiveAgents] = useState(0)

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get team from cookie
            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]?.trim()

            if (!selectedTeamCookie) {
                setError('No alliance selected.')
                setIsLoading(false)
                return
            }

            const data = await getLeaderboard(selectedTeamCookie)
            if ('error' in data) {
                setError(data.error as string)
            } else {
                setLeaderboard(data)

                // Calculate Summary Metrics
                setTotalXP(data.reduce((acc, curr) => acc + (curr.total_xp || 0), 0))
                setTotalMissions(data.reduce((acc, curr) => acc + (curr.tasks_completed || 0), 0))
                setActiveAgents(data.filter(u => u.tasks_completed > 0).length)
            }
            setIsLoading(false)
        }
        load()
    }, [])

    const getRank = (xp: number) => {
        return RANKS.find(r => xp >= r.minXP) || RANKS[RANKS.length - 1]
    }

    if (isLoading) {
        return <div className="p-8 text-slate-500 animate-pulse font-mono">Deciphering Analytics...</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    Command Center Analytics
                </h1>
                <p className="text-slate-500 font-mono text-sm mt-1">Alliance Performance & Operative Rankings</p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Target className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Missions</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{totalMissions}</p>
                    <p className="text-xs text-slate-400 mt-1">Completed Objectives</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <ZapIcon className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Alliance Velocity</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{totalXP.toLocaleString()} XP</p>
                    <p className="text-xs text-slate-400 mt-1">Total Experience Generated</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Users className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Agents</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{activeAgents}</p>
                    <p className="text-xs text-slate-400 mt-1">Contributors this cycle</p>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Operative Performance
                    </h3>
                    <span className="text-xs font-mono text-slate-400">Live Rankings</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                <th className="px-6 py-3 w-16 text-center">#</th>
                                <th className="px-6 py-3">Operative</th>
                                <th className="px-6 py-3">Rank Designation</th>
                                <th className="px-6 py-3 text-right">Missions</th>
                                <th className="px-6 py-3 text-right">Total XP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {leaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        No metrics available. Complete tasks to initiate ranking.
                                    </td>
                                </tr>
                            ) : (
                                leaderboard.map((entry, index) => {
                                    const rank = getRank(entry.total_xp || 0)
                                    const RankIcon = rank.icon
                                    const isTop3 = index < 3

                                    return (
                                        <tr key={entry.user_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-center">
                                                {index === 0 && <span className="text-2xl">🥇</span>}
                                                {index === 1 && <span className="text-2xl">🥈</span>}
                                                {index === 2 && <span className="text-2xl">🥉</span>}
                                                {index > 2 && <span className="font-mono text-slate-400 font-bold">#{index + 1}</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">
                                                    {entry.first_name || entry.last_name
                                                        ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                                                        : 'Unknown Agent'}
                                                </div>
                                                <div className="text-xs text-slate-500">{entry.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${rank.color}`}>
                                                    <RankIcon className="h-3 w-3" />
                                                    {rank.name}
                                                </div>
                                                {/* XP Progress Bar to next rank logic could go here */}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-600">
                                                {entry.tasks_completed}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-slate-900">{entry.total_xp.toLocaleString()}</span>
                                                <span className="text-xs text-slate-400 ml-1">XP</span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200 text-sm">
                    Analytics Error: {error}
                </div>
            )}
        </div>
    )
}

function ZapIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    )
}

function Trophy({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
