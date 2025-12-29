'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getRoleContext } from '@/lib/role-service'

export interface AnalyticsData {
    velocity: number
    successRate: number
    blockedUnits: number
}

export interface DepartmentAnalytics {
    name: string
    taskCount: number
    totalXP: number
}

export interface LeaderboardEntry {
    user_id: string
    first_name: string | null
    last_name: string | null
    role: string
    email: string

    // Stats
    total_tasks_assigned: number
    tasks_done: number
    completion_rate: number

    total_xp: number // For Rank
    current_load: number // Active XP

    // Derived
    rank: string
    rankColor: string
    loadBalanceScore: number
}

export interface QuestIntelligence {
    id: string
    name: string
    successRate: number
    dropRate: number
    urgencyPressure: number
    total_xp: number
}

// Helper to determine rank
function getRank(xp: number): { name: string; color: string } {
    if (xp >= 5000) return { name: 'Legendary', color: 'text-yellow-500' }
    if (xp >= 2000) return { name: 'Vanguard', color: 'text-purple-500' }
    return { name: 'Recruit', color: 'text-gray-500' }
}

function getCategory(status: any): string {
    return status?.category || ''
}

export async function getGlobalAnalytics(teamId: string, filters?: { questId?: string | 'all', assigneeId?: string | 'all' }) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return null

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    noStore()

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch Tasks
    let query = supabase
        .from('tasks')
        .select(`
            id, updated_at, was_dropped, needs_info, quest_id, assigned_to,
            status:statuses!status_id(category),
            size:sizes!size_id(xp_points)
        `)
        .eq('team_id', teamId)

    // Apply Filters
    if (filters?.questId && filters.questId !== 'all') {
        query = query.eq('quest_id', filters.questId)
    }
    if (filters?.assigneeId && filters.assigneeId !== 'all') {
        query = query.eq('assigned_to', filters.assigneeId)
    }

    const { data: tasks, error } = await query

    if (error) {
        console.error('getGlobalAnalytics Error:', error)
        return null
    }

    const typedTasks = tasks as any[]

    // 2. Compute Metrics
    const doneTasks = typedTasks.filter(t => getCategory(t.status) === 'done')

    // Velocity
    const velocity = doneTasks
        .filter(t => t.updated_at >= sevenDaysAgo)
        .reduce((sum, t) => {
            const xp = t.size?.xp_points
            return sum + (xp || 0)
        }, 0)

    // Success Rate
    const totalTasks = typedTasks.length
    const successRate = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0

    // Blocked Units
    const blockedUnits = typedTasks.filter(t => t.needs_info).length

    return {
        velocity,
        successRate,
        blockedUnits
    }
}

export async function getDepartmentAnalytics(teamId: string, filters?: { questId?: string | 'all' }): Promise<DepartmentAnalytics[]> {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return []

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    noStore()

    // Query tasks with department info
    let query = supabase
        .from('tasks')
        .select(`
            size:sizes!size_id(xp_points),
            branch:departments!department_id(name)
        `)
        .eq('team_id', teamId)
        .not('department_id', 'is', null)

    if (filters?.questId && filters.questId !== 'all') {
        query = query.eq('quest_id', filters.questId)
    }

    const { data, error } = await query
    if (error || !data) {
        console.error('getDepartmentAnalytics Error:', error)
        return []
    }

    // Aggregate
    const map = new Map<string, { count: number, xp: number }>()

    data.forEach((t: any) => {
        const deptName = t.branch?.name || 'Unknown'
        const xp = t.size?.xp_points || 0

        const current = map.get(deptName) || { count: 0, xp: 0 }
        map.set(deptName, {
            count: current.count + 1,
            xp: current.xp + xp
        })
    })

    return Array.from(map.entries()).map(([name, stats]) => ({
        name,
        taskCount: stats.count,
        totalXP: stats.xp
    })).sort((a, b) => b.totalXP - a.totalXP)
}


export async function getLeaderboard(teamId: string, filters?: { questId?: string | 'all' }) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return []

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    noStore()

    // 1. Fetch Members (Filter out Commanders)
    const { data: members, error: memError } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId)

    if (memError || !members) {
        return []
    }

    // Filter out Owner and Admin roles
    const crewMembers = members.filter(m => !['owner', 'admin'].includes(m.role))

    if (crewMembers.length === 0) return []

    // 2. Fetch Profiles 
    const userIds = crewMembers.map(m => m.user_id)
    let profiles: any[] = []
    if (userIds.length > 0) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds)
        if (profileData) profiles = profileData
    }

    // 3. Create Map 
    const profileMap = new Map(
        profiles.map(p => [String(p.id).toLowerCase().trim(), p])
    )

    // 4. Fetch Tasks
    let taskQuery = supabase
        .from('tasks')
        .select(`
            assigned_to, 
            status:statuses!status_id(category),
            size:sizes!size_id(xp_points)
        `)
        .eq('team_id', teamId)
        .not('assigned_to', 'is', null)

    if (filters?.questId && filters.questId !== 'all') {
        taskQuery = taskQuery.eq('quest_id', filters.questId)
    }

    const { data: tasks } = await taskQuery
    const typedTasks = (tasks || []) as any[]

    // 5. Build Leaderboard
    const leaderboard: LeaderboardEntry[] = crewMembers.map((m: any) => {
        const normalizedUserId = String(m.user_id).toLowerCase().trim()

        // Filter tasks 
        const userTasks = typedTasks.filter(t =>
            String(t.assigned_to).toLowerCase().trim() === normalizedUserId
        )

        const doneTasks = userTasks.filter(t => getCategory(t.status) === 'done')
        const activeTasks = userTasks.filter(t => getCategory(t.status) === 'active')

        const total_xp = doneTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)
        const current_load = activeTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)

        const profile = profileMap.get(normalizedUserId)
        const emailFallback = profile?.email ? profile.email.split('@')[0] : 'Unknown Operative'
        const firstName = profile?.first_name || emailFallback

        const rankInfo = getRank(total_xp)

        const tasks_done = doneTasks.length
        const total_tasks_assigned = userTasks.length
        const completion_rate = total_tasks_assigned > 0
            ? Math.round((tasks_done / total_tasks_assigned) * 100)
            : 0

        return {
            user_id: m.user_id,
            first_name: firstName,
            last_name: profile?.last_name || null,
            email: profile?.email || 'No Email',
            role: m.role,

            total_tasks_assigned,
            tasks_done,
            completion_rate,

            total_xp,
            current_load,
            rank: rankInfo.name,
            rankColor: rankInfo.color,
            loadBalanceScore: current_load
        }
    })

    return leaderboard.sort((a, b) => b.total_xp - a.total_xp)
}

export async function getQuestIntelligence(teamId: string, filters?: { questId?: string | 'all', assigneeId?: string | 'all' }) {
    const ctx = await getRoleContext(teamId)
    if (!ctx) return []

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    noStore()

    // 1. Query Quests with nested Tasks
    let query = supabase
        .from('quests')
        .select(`
            id,
            name,
            tasks (
                id,
                was_dropped,
                assigned_to,
                status:statuses!status_id(category),
                size:sizes!size_id(xp_points),
                urgency:urgencies!urgency_id(weight)
            )
        `)
        .eq('team_id', teamId)
        .is('is_archived', false)

    if (filters?.questId && filters.questId !== 'all') {
        query = query.eq('id', filters.questId)
    }

    const { data: quests, error } = await query

    if (error || !quests) return []

    return quests.map((q: any) => {
        let tasks = (q.tasks || []) as any[]

        // Filter by assigned_to
        if (filters?.assigneeId && filters.assigneeId !== 'all') {
            const filterId = String(filters.assigneeId).toLowerCase().trim()
            tasks = tasks.filter(t => String(t.assigned_to).toLowerCase().trim() === filterId)
        }

        const total = tasks.length
        if (total === 0) {
            return {
                id: q.id,
                name: q.name,
                successRate: 0,
                dropRate: 0,
                urgencyPressure: 0,
                total_xp: 0
            }
        }

        const done = tasks.filter(t => getCategory(t.status) === 'done').length
        const dropped = tasks.filter(t => t.was_dropped).length
        const successRate = (done / total) * 100
        const dropRate = (dropped / total) * 100

        const totalXP = tasks.reduce((sum, t) => {
            const xp = t.size?.xp_points
            return sum + (xp || 0)
        }, 0)

        // Urgency Pressure: urgency.weight >= 3
        const urgentXP = tasks.reduce((sum, t) => {
            const urgency = t.urgency
            const weight = urgency?.weight || 0
            const xp = t.size?.xp_points
            return (weight >= 3) ? sum + (xp || 0) : sum
        }, 0)

        const urgencyPressure = totalXP > 0 ? (urgentXP / totalXP) * 100 : 0

        return {
            id: q.id,
            name: q.name,
            successRate,
            dropRate,
            urgencyPressure,
            total_xp: totalXP
        }
    })
}