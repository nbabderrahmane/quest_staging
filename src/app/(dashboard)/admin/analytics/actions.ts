'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getRoleContext } from '@/lib/role-service'
import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { Result } from '@/lib/result'

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
    total_tasks_assigned: number
    tasks_done: number
    completion_rate: number
    total_xp: number
    current_load: number
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

import { getRankFromXP } from '@/lib/ranks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCategory(status: any): string {
    return status?.category || ''
}

export async function getGlobalAnalytics(
    teamId: string,
    filters?: { questId?: string | 'all', assigneeId?: string | 'all' }
): Promise<Result<AnalyticsData | null>> {
    return runAction('getGlobalAnalytics', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'No access to this workspace.' } }
        }

        const supabase = await getUserClient()
        noStore()

        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from('tasks') as any)
            .select(`
                id, updated_at, was_dropped, needs_info, quest_id, assigned_to,
                status:statuses!status_id(category),
                size:sizes!size_id(xp_points)
            `)
            .eq('team_id', teamId)

        if (filters?.questId && filters.questId !== 'all') {
            query = query.eq('quest_id', filters.questId)
        }
        if (filters?.assigneeId && filters.assigneeId !== 'all') {
            query = query.eq('assigned_to', filters.assigneeId)
        }

        const { data: tasks, error } = await query

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch analytics.', details: error } }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedTasks = tasks as any[]
        const doneTasks = typedTasks.filter(t => getCategory(t.status) === 'done')

        const velocity = doneTasks
            .filter(t => t.updated_at >= sevenDaysAgo)
            .reduce((sum, t) => sum + (t.size?.xp_points || 0), 0)

        const totalTasks = typedTasks.length
        const successRate = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0
        const blockedUnits = typedTasks.filter(t => t.needs_info).length

        return { success: true, data: { velocity, successRate, blockedUnits } }
    })
}

export async function getDepartmentAnalytics(
    teamId: string,
    filters?: { questId?: string | 'all' }
): Promise<Result<DepartmentAnalytics[]>> {
    return runAction('getDepartmentAnalytics', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'No access to this workspace.' } }
        }

        const supabase = await getUserClient()
        noStore()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from('tasks') as any)
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
            return { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch department analytics.', details: error } }
        }

        const map = new Map<string, { count: number, xp: number }>()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((t: any) => {
            const deptName = t.branch?.name || 'Unknown'
            const xp = t.size?.xp_points || 0
            const current = map.get(deptName) || { count: 0, xp: 0 }
            map.set(deptName, { count: current.count + 1, xp: current.xp + xp })
        })

        const result = Array.from(map.entries()).map(([name, stats]) => ({
            name,
            taskCount: stats.count,
            totalXP: stats.xp
        })).sort((a, b) => b.totalXP - a.totalXP)

        return { success: true, data: result }
    })
}

export async function getLeaderboard(
    teamId: string,
    filters?: { questId?: string | 'all' }
): Promise<Result<LeaderboardEntry[]>> {
    return runAction('getLeaderboard', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'No access to this workspace.' } }
        }

        const supabase = await getUserClient()
        noStore()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: members, error: memError } = await (supabase.from('team_members') as any)
            .select('user_id, role')
            .eq('team_id', teamId)

        if (memError || !members) {
            return { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch team members.' } }
        }

        const crewMembers = members.filter((m: { role: string }) => !['owner', 'admin'].includes(m.role))
        if (crewMembers.length === 0) {
            return { success: true, data: [] }
        }

        const userIds = crewMembers.map((m: { user_id: string }) => m.user_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let profiles: any[] = []
        if (userIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profileData } = await (supabase.from('profiles') as any)
                .select('id, first_name, last_name, email')
                .in('id', userIds)
            if (profileData) profiles = profileData
        }

        const profileMap = new Map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            profiles.map((p: any) => [String(p.id).toLowerCase().trim(), p])
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let taskQuery = (supabase.from('tasks') as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedTasks = (tasks || []) as any[]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaderboard: LeaderboardEntry[] = crewMembers.map((m: any) => {
            const normalizedUserId = String(m.user_id).toLowerCase().trim()
            const userTasks = typedTasks.filter(t =>
                String(t.assigned_to).toLowerCase().trim() === normalizedUserId
            )

            const doneTasks = userTasks.filter(t => getCategory(t.status) === 'done')
            // Active Load = Anything assigned that is NOT done and NOT backlog
            // (Includes 'active', 'todo', 'in_progress', 'review', etc.)
            const activeTasks = userTasks.filter(t => {
                const cat = getCategory(t.status)
                return cat !== 'done' && cat !== 'backlog'
            })

            const total_xp = doneTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)
            const current_load = activeTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)

            const profile = profileMap.get(normalizedUserId)
            const emailFallback = profile?.email ? profile.email.split('@')[0] : 'Unknown Operative'
            const firstName = profile?.first_name || emailFallback

            const rankInfo = getRankFromXP(total_xp)
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

        return { success: true, data: leaderboard.sort((a, b) => b.total_xp - a.total_xp) }
    })
}

export async function getQuestIntelligence(
    teamId: string,
    filters?: { questId?: string | 'all', assigneeId?: string | 'all' }
): Promise<Result<QuestIntelligence[]>> {
    return runAction('getQuestIntelligence', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'No access to this workspace.' } }
        }

        const supabase = await getUserClient()
        noStore()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from('quests') as any)
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

        if (error || !quests) {
            return { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch quest intelligence.' } }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = quests.map((q: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let tasks = (q.tasks || []) as any[]

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

            const totalXP = tasks.reduce((sum, t) => sum + (t.size?.xp_points || 0), 0)
            const urgentXP = tasks.reduce((sum, t) => {
                const weight = t.urgency?.weight || 0
                return (weight >= 3) ? sum + (t.size?.xp_points || 0) : sum
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

        return { success: true, data: result }
    })
}