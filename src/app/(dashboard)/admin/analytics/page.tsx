'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    getGlobalAnalytics,
    getLeaderboard,
    getQuestIntelligence,
    getDepartmentAnalytics,
    getDeadlineCompliance,
    AnalyticsData,
    LeaderboardEntry,
    QuestIntelligence,
    DepartmentAnalytics,
    DeadlineCompliance
} from './actions'
import {
    Crown, Shield, Star, Users, Target, Activity, AlertTriangle, Briefcase, Zap, RefreshCw, PieChart as PieIcon, Building2,
    Medal, Hexagon, Component, Terminal, Rocket, Swords, Skull, Ghost, Crosshair, Clock, Search
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getRankFromXP } from '@/lib/ranks'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

// Icon Mapping
const getRankIcon = (rankName: string) => {
    switch (rankName) {
        case 'Recruit': return Star
        case 'Private': return Component
        case 'Corporal': return Hexagon
        case 'Sergeant': return Shield
        case 'Lieutenant': return Medal
        case 'Captain': return Swords
        case 'Major': return Target
        case 'Commander': return Crosshair
        case 'Colonel': return Zap
        case 'Brigadier': return Activity
        case 'General': return Rocket
        case 'Marshal': return Crown
        case 'Commodore': return Ghost
        case 'Rear Admiral': return Skull
        case 'Vice Admiral': return Terminal
        case 'Admiral': return Users
        case 'Fleet Admiral': return PieIcon
        case 'Grand Admiral': return Building2
        case 'Galactic Warlord': return AlertTriangle
        case 'Cosmic Deity': return Zap // Re-use zap or something else
        default: return Star
    }
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [questIntel, setQuestIntel] = useState<QuestIntelligence[]>([])
    const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics[]>([])
    const [deadlineCompliance, setDeadlineCompliance] = useState<DeadlineCompliance[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [filters, setFilters] = useState({ questId: 'all', assigneeId: 'all' })
    const [availableQuests, setAvailableQuests] = useState<{ id: string, name: string }[]>([])
    const [availableCrew, setAvailableCrew] = useState<{ id: string, name: string }[]>([])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const router = useRouter()

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
        const [analyticsRes, leaderboardRes, questRes, departmentRes, complianceRes] = await Promise.all([
            getGlobalAnalytics(selectedTeamCookie, filters),
            getLeaderboard(selectedTeamCookie, { questId: filters.questId }),
            getQuestIntelligence(selectedTeamCookie, filters),
            getDepartmentAnalytics(selectedTeamCookie, { questId: filters.questId }),
            getDeadlineCompliance(selectedTeamCookie, { questId: filters.questId })
        ])

        if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data)
        if (leaderboardRes.success && leaderboardRes.data) setLeaderboard(leaderboardRes.data)
        if (departmentRes.success && departmentRes.data) setDeptAnalytics(departmentRes.data)
        if (complianceRes.success && complianceRes.data) setDeadlineCompliance(complianceRes.data)

        if (questRes.success && questRes.data) {
            setQuestIntel(questRes.data)
            if (filters.questId === 'all') {
                setAvailableQuests(questRes.data.map(q => ({ id: q.id, name: q.name })))
            }
        }

        // Populate Crew Options
        if (leaderboardRes.success && leaderboardRes.data && filters.assigneeId === 'all') {
            setAvailableCrew(leaderboardRes.data.map(l => ({
                id: l.user_id,
                name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown Agent'
            })))
        }

        setIsLoading(false)
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters])

    if (isLoading) {
        return <div className="p-8 text-muted-foreground animate-pulse font-mono">Deciphering Analytics...</div>
    }

    // Chart Data Preparation
    const taskCountData = deptAnalytics.map(d => ({ name: d.name, value: d.taskCount }))
    const xpData = deptAnalytics.map(d => ({ name: d.name, value: d.totalXP }))

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                    <Activity className="h-8 w-8 text-primary" />
                    Unified Analytics System
                </h1>
                <div className="flex justify-between items-end">
                    <p className="text-muted-foreground font-mono text-sm mt-1">Alliance Performance & Strategic Intelligence</p>

                    <div className="flex gap-2">
                        {/* Filters */}
                        <select
                            value={filters.questId}
                            onChange={(e) => setFilters(prev => ({ ...prev, questId: e.target.value }))}
                            className="bg-card border border-border text-foreground text-xs font-bold uppercase rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
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
                                className="bg-card border border-border text-foreground text-xs font-bold uppercase rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-card text-muted-foreground border border-border rounded text-xs font-bold uppercase hover:bg-muted hover:text-primary transition-colors"
                        >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 1: Alliance Pulse */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Alliance Pulse
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Zap className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Alliance Velocity</h3>
                        </div>
                        <p className="text-3xl font-black text-foreground">{analytics?.velocity.toLocaleString() ?? 0} <span className="text-sm font-normal text-muted-foreground">XP</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Last 7 Days Output</p>
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Target className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Target className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Global Success Rate</h3>
                        </div>
                        <p className="text-3xl font-black text-foreground">{analytics?.successRate ? analytics.successRate.toFixed(1) : '0.0'}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Mission Completion Ratio</p>
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                            <AlertTriangle className="w-32 h-32 -mr-8 -mt-8" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Blocked Units</h3>
                        </div>
                        <p className="text-3xl font-black text-foreground">{analytics?.blockedUnits ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Missions needing info</p>
                    </div>
                </div>
            </section>

            {/* Section 2: Department Intelligence (NEW) */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Department Intelligence
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Task Count Chart */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">Task Distribution</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={taskCountData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {taskCountData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* XP Chart */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-4">XP Contribution</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={xpData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#82ca9d"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {xpData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Crew Performance & Load */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Crew Performance & Load
                </h2>
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase text-muted-foreground tracking-wider">
                                    <th className="px-6 py-3 w-16 text-center">#</th>
                                    <th className="px-6 py-3">Operative</th>
                                    <th className="px-6 py-3 text-center">Tasks</th>
                                    <th className="px-6 py-3">Rank</th>
                                    <th className="px-6 py-3">Current Load (Active XP)</th>
                                    <th className="px-6 py-3 text-right">Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {leaderboard.map((entry, index) => {
                                    const RankIcon = getRankIcon(entry.rank)
                                    // Load Balance Visualization
                                    const loadPercent = Math.min((entry.current_load / 1000) * 100, 100)

                                    return (
                                        <tr key={entry.user_id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 text-center text-muted-foreground font-mono text-xs">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground">
                                                    {entry.first_name || entry.last_name
                                                        ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                                                        : (entry.email || 'Unknown Operative')}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{entry.role}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-foreground">{entry.tasks_done} <span className="text-muted-foreground text-xs font-normal">/ {entry.total_tasks_assigned}</span></span>
                                                    <span className="text-[10px] uppercase text-muted-foreground">DONE</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${entry.rankColor}`}>
                                                    <RankIcon className="h-3 w-3" />
                                                    {entry.rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full max-w-xs">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-mono font-bold text-foreground">{entry.current_load} XP</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${loadPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${loadPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-black text-lg ${entry.completion_rate >= 80 ? 'text-green-500' : entry.completion_rate < 50 ? 'text-orange-500' : 'text-foreground'}`}>{entry.completion_rate}%</span>
                                                    <span className="text-xs text-muted-foreground font-mono">Rate</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground italic">No crew data found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Section 4: Protocol Compliance (NEW) */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Protocol Compliance
                </h2>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-6">Deadline Adherence</h3>
                    <div className="h-72 w-full">
                        {deadlineCompliance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deadlineCompliance}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deadlineCompliance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 border-2 border-dashed border-muted rounded-lg">
                                <Search className="h-8 w-8 opacity-20" />
                                <p className="text-xs font-mono uppercase">No deadline data for this filter</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Section 5: Quest Intelligence */}
            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Quest Intelligence
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {questIntel.map(quest => (
                        <div key={quest.id} className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
                            <div>
                                <h3 className="font-bold text-foreground truncate" title={quest.name}>{quest.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono mt-1">Total XP: {quest.total_xp}</p>
                            </div>

                            <div className="space-y-3">
                                {/* Success Rate */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Success Rate</span>
                                        <span className="font-bold text-foreground">{quest.successRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${quest.successRate}%` }} />
                                    </div>
                                </div>

                                {/* Drop Rate */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Drop Rate</span>
                                        <span className="font-bold text-foreground">{quest.dropRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-destructive rounded-full" style={{ width: `${quest.dropRate}%` }} />
                                    </div>
                                </div>

                                {/* Urgency Pressure */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Urgency Pressure</span>
                                        <span className="font-bold text-foreground">{quest.urgencyPressure.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${quest.urgencyPressure}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {questIntel.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground italic bg-card rounded-xl border border-border border-dashed">
                            No active quest intelligence available.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
