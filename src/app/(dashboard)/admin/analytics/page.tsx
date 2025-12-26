'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getGlobalAnalytics, getLeaderboard, getQuestIntelligence, AnalyticsData, LeaderboardEntry, QuestIntelligence } from './actions'
import { Crown, Shield, Star, Users, Target, Activity, AlertTriangle, Briefcase, Zap, RefreshCw } from 'lucide-react'

// Rank Configuration
const RANKS = [
    { name: 'Legendary', minXP: 5000, color: 'text-yellow-600 bg-yellow-100 border-yellow-200', icon: Crown },
    { name: 'Vanguard', minXP: 2000, color: 'text-purple-600 bg-purple-100 border-purple-200', icon: Shield },
    { name: 'Recruit', minXP: 0, color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Star },
]

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [questIntel, setQuestIntel] = useState<QuestIntelligence[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [filters, setFilters] = useState({ questId: 'all', assigneeId: 'all' })
    const [availableQuests, setAvailableQuests] = useState<{ id: string, name: string }[]>([])
    const [availableCrew, setAvailableCrew] = useState<{ id: string, name: string }[]>([])

    const router = useRouter()

    useEffect(() => {
        async function load() {
            // Re-load logic with filters
            const supabase = createClient()
            // ... (Auth logic mostly same, but need to re-fetch on filter change if possible, 
            // but for simplicity we fetch once then maybe refetch stats? 
            // Actually, we should move data fetching into a separate function we can call.)
        }
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUserId(user.id)

        const selectedTeamCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('selected_team='))
            ?.split('=')[1]?.trim()

        if (!selectedTeamCookie) {
            setError('No alliance selected.')
            setIsLoading(false)
            return
        }

        const { data: member } = await supabase
            .from('team_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('team_id', selectedTeamCookie)
            .single()

        const role = member?.role || 'analyst'
        setUserRole(role)

        // Parallel fetch with filters
        const [analyticsData, leaderboardData, questData] = await Promise.all([
            getGlobalAnalytics(selectedTeamCookie, filters),
            getLeaderboard(selectedTeamCookie, { questId: filters.questId }),
            getQuestIntelligence(selectedTeamCookie, filters)
        ])

        if (analyticsData) setAnalytics(analyticsData)
        if (leaderboardData) setLeaderboard(leaderboardData)
        if (questData) {
            setQuestIntel(questData)
            // Populate Quest Options (only on first load ideally, but doing it here is safe)
            if (filters.questId === 'all') { // Only update list if not filtered, or persist full list
                setAvailableQuests(questData.map(q => ({ id: q.id, name: q.name })))
            }
        }

        // Populate Crew Options
        if (leaderboardData && filters.assigneeId === 'all') {
            setAvailableCrew(leaderboardData.map(l => ({
                id: l.user_id,
                name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown Agent'
            })))
        }

        setIsLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [filters]) // Refetch on filter change

    const getRankConfig = (rankName: string) => {
        return RANKS.find(r => r.name === rankName) || RANKS[RANKS.length - 1]
    }

    if (isLoading) {
        return <div className="p-8 text-slate-500 animate-pulse font-mono">Deciphering Analytics...</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                    <Activity className="h-8 w-8 text-blue-600" />
                    Unified Analytics System
                </h1>
                <div className="flex justify-between items-end">
                    <p className="text-slate-500 font-mono text-sm mt-1">Alliance Performance & Strategic Intelligence</p>

                    <div className="flex gap-2">
                        {/* Filters */}
                        <select
                            value={filters.questId}
                            onChange={(e) => setFilters(prev => ({ ...prev, questId: e.target.value }))}
                            className="bg-white border border-slate-200 text-xs font-bold uppercase rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Quests</option>
                            {availableQuests.map(q => (
                                <option key={q.id} value={q.id}>{q.name}</option>
                            ))}
                        </select>

                        {['manager', 'owner', 'admin'].includes(userRole || '') && (
                            <select
                                value={filters.assigneeId}
                                onChange={(e) => setFilters(prev => ({ ...prev, assigneeId: e.target.value }))}
                                className="bg-white border border-slate-200 text-xs font-bold uppercase rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Crew</option>
                                {availableCrew.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => {
                                setIsRefreshing(true)
                                loadData()
                                setTimeout(() => setIsRefreshing(false), 1000)
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded text-xs font-bold uppercase hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 1: Alliance Pulse */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Alliance Pulse
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Zap className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Alliance Velocity</h3>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analytics?.velocity.toLocaleString() ?? 0} <span className="text-sm font-normal text-slate-400">XP</span></p>
                        <p className="text-xs text-slate-400 mt-1">Last 7 Days Output</p>
                        {/* Progress bar could go here if we had a target */}
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Target className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Target className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Global Success Rate</h3>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analytics?.successRate ? analytics.successRate.toFixed(1) : '0.0'}%</p>
                        <p className="text-xs text-slate-400 mt-1">Mission Completion Ratio</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <AlertTriangle className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Blocked Units</h3>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{analytics?.blockedUnits ?? 0}</p>
                        <p className="text-xs text-slate-400 mt-1">Missions needing info</p>
                    </div>
                </div>
            </section>

            {/* Section 2: Crew Performance & Load */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Crew Performance & Load
                </h2>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                    <th className="px-6 py-3 w-16 text-center">#</th>
                                    <th className="px-6 py-3">Operative</th>
                                    <th className="px-6 py-3">Rank</th>
                                    <th className="px-6 py-3">Current Load (Active XP)</th>
                                    <th className="px-6 py-3 text-right">Total XP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard.map((entry, index) => {
                                    const rankConfig = getRankConfig(entry.rank)
                                    const RankIcon = rankConfig.icon
                                    // Load Balance Visualization
                                    // Assuming max load helps visualize relation. Let's create a simple bar.
                                    // We don't have max load, so we might just show raw bars scaled by an arbitrary max (e.g. 1000) or relative to max user.
                                    // Let's assume 1000 XP is high load.
                                    const loadPercent = Math.min((entry.current_load / 1000) * 100, 100)

                                    return (
                                        <tr key={entry.user_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">
                                                    {entry.first_name || entry.last_name
                                                        ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                                                        : (entry.email || 'Unknown Operative')}
                                                </div>
                                                <div className="text-xs text-slate-500">{entry.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${rankConfig.color}`}>
                                                    <RankIcon className="h-3 w-3" />
                                                    {entry.rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full max-w-xs">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-mono font-bold text-slate-700">{entry.current_load} XP</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${loadPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${loadPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-slate-900">{entry.total_xp.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No crew data found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Section 3: Quest Intelligence */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    Quest Intelligence
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {questIntel.map(quest => (
                        <div key={quest.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                            <div>
                                <h3 className="font-bold text-slate-900 truncate" title={quest.name}>{quest.name}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">Total XP: {quest.total_xp}</p>
                            </div>

                            <div className="space-y-3">
                                {/* Success Rate */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Success Rate</span>
                                        <span className="font-bold text-slate-900">{quest.successRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${quest.successRate}%` }} />
                                    </div>
                                </div>

                                {/* Drop Rate */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Drop Rate</span>
                                        <span className="font-bold text-slate-900">{quest.dropRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${quest.dropRate}%` }} />
                                    </div>
                                </div>

                                {/* Urgency Pressure */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Urgency Pressure</span>
                                        <span className="font-bold text-slate-900">{quest.urgencyPressure.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${quest.urgencyPressure}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {questIntel.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200 border-dashed">
                            No active quest intelligence available.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
