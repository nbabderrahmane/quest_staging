'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getRoleContext } from '@/lib/role-service'

export interface AnalyticsData {
    velocity: number
    successRate: number
    blockedUnits: number
}

export interface LeaderboardEntry {
    user_id: string
    first_name: string | null
    last_name: string | null
    role: string
    // avatar_url removed as it doesn't exist in DB
    email: string

    // Stats
    tasks_done: number
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

    // 1. Fetch Members
    const { data: members, error: memError } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId)

    if (memError || !members) {
        console.error('❌ Leaderboard Error (Members):', memError)
        return []
    }

    console.log('✅ Members fetched:', members.length)
    console.log('📋 Member IDs:', members.map(m => m.user_id))

    // 2. Fetch Profiles (WITHOUT normalization in query)
    const userIds = members.map(m => m.user_id) // Keep original UUIDs

    let profiles: any[] = []
    if (userIds.length > 0) {
        const { data: profileData, error: profError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email') // Removed avatar_url
            .in('id', userIds)

        if (!profError && profileData) {
            profiles = profileData
            console.log('✅ Profiles fetched:', profiles.length)
            console.log('📋 Profile data:', profiles.map(p => ({
                id: p.id,
                first_name: p.first_name,
                email: p.email
            })))
        } else {
            console.error('❌ Profile fetch error:', profError)
        }
    }

    // 3. Create Map with normalized keys
    const profileMap = new Map(
        profiles.map(p => [
            String(p.id).toLowerCase().trim(),
            p
        ])
    )

    console.log('🗺️ ProfileMap keys:', Array.from(profileMap.keys()))

    // 4. Fetch Tasks
    let taskQuery = supabase
        .from('tasks')
        .select(`
            assigned_to, quest_id,
            status:statuses!status_id(category),
            size:sizes!size_id(xp_points)
        `)
        .eq('team_id', teamId)

    if (filters?.questId && filters.questId !== 'all') {
        taskQuery = taskQuery.eq('quest_id', filters.questId)
    }

    const { data: tasks } = await taskQuery
    const typedTasks = (tasks || []) as any[]

    console.log('✅ Tasks fetched:', typedTasks.length)
    console.log('📋 Task assigned_to IDs:', [...new Set(typedTasks.map(t => t.assigned_to))])

    // 5. Build Leaderboard
    const leaderboard: LeaderboardEntry[] = members.map((m: any, index: number) => {
        const normalizedUserId = String(m.user_id).toLowerCase().trim()

        // Filter tasks with normalized comparison
        const userTasks = typedTasks.filter(t =>
            String(t.assigned_to).toLowerCase().trim() === normalizedUserId
        )

        const doneTasks = userTasks.filter(t => getCategory(t.status) === 'done')
        const activeTasks = userTasks.filter(t => getCategory(t.status) === 'active')

        // Calculate XP
        const total_xp = doneTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)
        const current_load = activeTasks.reduce((acc, t) => acc + (t.size?.xp_points || 0), 0)

        // Lookup profile
        const profile = profileMap.get(normalizedUserId)

        console.log(`👤 User ${index + 1}:`, {
            original_id: m.user_id,
            normalized_id: normalizedUserId,
            profile_found: !!profile,
            first_name: profile?.first_name || 'NOT FOUND',
            tasks: userTasks.length,
            done_tasks: doneTasks.length,
            total_xp
        })

        const emailFallback = profile?.email ? profile.email.split('@')[0] : 'Unknown Operative'
        const firstName = profile?.first_name || emailFallback

        const rankInfo = getRank(total_xp)

        return {
            user_id: m.user_id,
            first_name: firstName,
            last_name: profile?.last_name || null,
            email: profile?.email || 'No Email',
            // avatar_url removed
            role: m.role,
            tasks_done: doneTasks.length,
            total_xp,
            current_load,
            rank: rankInfo.name,
            rankColor: rankInfo.color,
            loadBalanceScore: current_load
        }
    })

    console.log('🏆 Final leaderboard:', leaderboard.map(l => ({
        name: l.first_name,
        xp: l.total_xp,
        tasks: l.tasks_done
    })))

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

    if (filters?.questId && filters.questId !== 'all') {
        query = query.eq('id', filters.questId)
    }

    const { data: quests, error } = await query

    if (error || !quests) return []

    return quests.map((q: any) => {
        let tasks = (q.tasks || []) as any[]

        // Filter by assigned_to
        if (filters?.assigneeId && filters.assigneeId !== 'all') {
            // Robust filter
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