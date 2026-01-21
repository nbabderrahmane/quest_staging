'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'
import { EisenhowerService } from '@/services/eisenhower-service'

export interface QuestPrepData {
    teamCapacity: {
        analystCount: number
        avgXpPerPerson: number
        historicalMaxXp: number
        targetXp: number // 110% of historical max
    }
    proposedTasks: ProposedTask[]
    totalProposedXp: number
    activeQuests: { id: string; name: string }[]
}

export interface ProposedTask {
    id: string
    title: string
    xp: number
    quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    priority_score: number
    urgency_name: string
    department_name: string | null
    client_name: string | null
    selected: boolean
}

// Get Quest Prep data for sprint planning
export async function getQuestPrepData(teamId: string): Promise<{ success: boolean; data?: QuestPrepData; error?: string }> {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // 1. Get active analysts count
    const { data: analysts } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .in('role', ['analyst', 'member'])
        .eq('is_active', true)

    const analystCount = analysts?.length || 1

    // 2. Calculate historical XP (from last 3 completed quests)
    const { data: completedQuests } = await supabase
        .from('quests')
        .select(`
            id,
            tasks (
                id,
                size:sizes!size_id(xp_points),
                status:statuses!status_id(category)
            )
        `)
        .eq('team_id', teamId)
        .not('end_date', 'is', null)
        .order('end_date', { ascending: false })
        .limit(3)

    let totalHistoricalXp = 0
    let questCount = 0
    let maxQuestXp = 0

    if (completedQuests) {
        completedQuests.forEach((quest: any) => {
            const questXp = (quest.tasks || [])
                .filter((t: any) => t.status?.category === 'done')
                .reduce((sum: number, t: any) => sum + (t.size?.xp_points || 0), 0)

            totalHistoricalXp += questXp
            questCount++
            if (questXp > maxQuestXp) maxQuestXp = questXp
        })
    }

    const avgXpPerQuest = questCount > 0 ? totalHistoricalXp / questCount : 100
    const avgXpPerPerson = analystCount > 0 ? avgXpPerQuest / analystCount : avgXpPerQuest
    const historicalMaxXp = maxQuestXp || avgXpPerQuest
    const targetXp = Math.round(historicalMaxXp * 1.10) // 110% of max

    // 3. Get backlog tasks for proposal
    const { data: backlogTasks } = await supabase
        .from('tasks')
        .select(`
            id, title,
            size:sizes!size_id(xp_points),
            urgency:urgencies!urgency_id(name, weight),
            status:statuses!status_id(category),
            department:departments!department_id(name),
            client:clients!client_id(name),
            deadline_at
        `)
        .eq('team_id', teamId)
        .is('quest_id', null)
        .eq('was_dropped', false)

    // Filter to only backlog category
    const backlogOnly = (backlogTasks || []).filter((t: any) => t.status?.category === 'backlog')

    // Enrich with Eisenhower data
    const enrichedTasks = EisenhowerService.enrichTasks(backlogOnly.map((t: any) => ({
        ...t,
        xp_points: t.size?.xp_points || 0
    })))

    // Sort by priority score (highest first)
    const sortedTasks = EisenhowerService.sortTasks(enrichedTasks)

    // Auto-select tasks until we hit target XP
    let runningXp = 0
    const proposedTasks: ProposedTask[] = sortedTasks.map((t: any) => {
        const xp = t.size?.xp_points || 0
        const shouldSelect = runningXp < targetXp
        if (shouldSelect) runningXp += xp

        return {
            id: t.id,
            title: t.title,
            xp,
            quadrant: t.quadrant || 'Q4',
            priority_score: t.priority_score || 0,
            urgency_name: t.urgency?.name || 'Normal',
            department_name: t.department?.name || null,
            client_name: t.client?.name || null,
            selected: shouldSelect
        }
    })

    // 4. Get active quests for assignment
    const { data: activeQuests } = await supabase
        .from('quests')
        .select('id, name')
        .eq('team_id', teamId)
        .is('end_date', null)
        .order('name')

    return {
        success: true,
        data: {
            teamCapacity: {
                analystCount,
                avgXpPerPerson: Math.round(avgXpPerPerson),
                historicalMaxXp: Math.round(historicalMaxXp),
                targetXp
            },
            proposedTasks,
            totalProposedXp: runningXp,
            activeQuests: activeQuests || []
        }
    }
}

// Finalize Quest Prep - assign selected tasks to a quest
export async function finalizeQuestPrep(
    teamId: string,
    questId: string,
    taskIds: string[]
): Promise<{ success: boolean; error?: string }> {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'Unauthorized' }
    }

    if (!questId || taskIds.length === 0) {
        return { success: false, error: 'Must select a quest and at least one task' }
    }

    const supabase = await createClient()

    // Get active status for the team
    const { data: activeStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('team_id', teamId)
        .eq('category', 'active')
        .order('sort_order')
        .limit(1)
        .single()

    if (!activeStatus) {
        return { success: false, error: 'No active status configured. Please set up statuses in The Forge.' }
    }

    // Batch update tasks
    const { error } = await supabase
        .from('tasks')
        .update({
            quest_id: questId,
            status_id: activeStatus.id,
            updated_at: new Date().toISOString()
        })
        .in('id', taskIds)
        .eq('team_id', teamId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/quest-prep')
    revalidatePath('/admin/pipeline')
    revalidatePath('/quest-board')

    return { success: true }
}
