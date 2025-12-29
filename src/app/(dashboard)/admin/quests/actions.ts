'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// Get all quests (objectives) for a team - Filter active vs archived
export async function getQuestObjectives(teamId: string, showArchived: boolean = false) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let query = supabaseAdmin
        .from('quests')
        .select(`
            *,
            creator:profiles!created_by(id, email, first_name, last_name),
            tasks (
                id,
                title,
                status:statuses!status_id(category, name),
                assigned_to,
                assignee:profiles!assigned_to(first_name, last_name, email)
            )
        `)
        .eq('team_id', teamId)
        .order('start_date', { ascending: false, nullsFirst: false })

    if (showArchived) {
        query = query.eq('is_archived', true)
    } else {
        // By default, showing active means NOT archived
        query = query.is('is_archived', false)
    }

    const { data, error } = await query

    if (error) {
        console.error('getQuestObjectives: Failed', error)
        return { error: `[${error.code}] ${error.message}` }
    }

    return data || []
}

// Create a new quest (objective) - Owner/Admin only
export async function createQuestObjective(
    teamId: string,
    data: {
        name: string
        description?: string
        boss_skin?: string
        start_date?: string
        end_date?: string
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'SECURITY BREACH: User not authenticated.' }
    }

    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders (Owner/Admin) can initiate quests.' }
    }

    if (!data.name || data.name.trim().length === 0) {
        return { success: false, error: 'PROTOCOL VIOLATION: Quest name is required.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('quests')
        .insert({
            team_id: teamId,
            name: data.name,
            description: data.description,
            boss_skin: data.boss_skin || 'generic_monster',
            start_date: data.start_date || new Date().toISOString(),
            end_date: data.end_date,
            created_by: user.id
        })

    if (error) {
        console.error('createQuestObjective: Failed', error)
        return { success: false, error: `QUEST INITIATION FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    return { success: true }
}

// Archive a quest
export async function archiveQuest(questId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    // Managers+ can archive
    if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can archive quests.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // First, standard deactivation if it was active
    await supabaseAdmin
        .from('quests')
        .update({ is_active: false })
        .eq('id', questId)
        .eq('team_id', teamId)

    // Then set archived
    const { error } = await supabaseAdmin
        .from('quests')
        .update({ is_archived: true })
        .eq('id', questId)
        .eq('team_id', teamId)

    if (error) {
        console.error('archiveQuest: Failed', error)
        return { success: false, error: `QUEST ARCHIVAL FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    return { success: true }
}

// Unarchive a quest
export async function unarchiveQuest(questId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can unarchive quests.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('quests')
        .update({ is_archived: false })
        .eq('id', questId)
        .eq('team_id', teamId)

    if (error) {
        console.error('unarchiveQuest: Failed', error)
        return { success: false, error: `QUEST RESTORATION FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    return { success: true }
}

// Toggle quest active status - Owner/Admin/Manager only
// Only one quest can be active per team
export async function toggleQuestActive(questId: string, teamId: string, setActive: boolean) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
        return { success: false, error: 'INSUFFICIENT CLEARANCE: Only commanders can deploy quests.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // If activating, first deactivate all other quests for this team
    if (setActive) {
        await supabaseAdmin
            .from('quests')
            .update({ is_active: false })
            .eq('team_id', teamId)
    }

    // Set the target quest status
    const { error } = await supabaseAdmin
        .from('quests')
        .update({ is_active: setActive })
        .eq('id', questId)
        .eq('team_id', teamId)

    if (error) {
        console.error('toggleQuestActive: Failed', error)
        return { success: false, error: `QUEST DEPLOYMENT FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    revalidatePath('/quest-board')
    return { success: true }
}

// Update a quest objective
export async function updateQuestObjective(
    questId: string,
    teamId: string,
    data: Partial<{
        name: string
        description: string
        boss_skin: string
        start_date: string | null
        end_date: string | null
        is_active: boolean
    }>
) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can modify quests.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('quests')
        .update({
            ...data,
            boss_skin: data.boss_skin || 'generic_monster',
            updated_at: new Date().toISOString()
        })
        .eq('id', questId)
        .eq('team_id', teamId)

    if (error) {
        console.error('updateQuestObjective: Failed', error)
        return { success: false, error: `QUEST UPDATE FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    return { success: true }
}

// Delete a quest objective - Owner only
export async function deleteQuestObjective(questId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !ctx.isOwner) {
        return { success: false, error: 'SECURITY BREACH: Only the Owner can abandon quests.' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin
        .from('quests')
        .delete()
        .eq('id', questId)
        .eq('team_id', teamId)

    if (error) {
        console.error('deleteQuestObjective: Failed', error)
        return { success: false, error: `QUEST DELETION FAILED: ${error.message}` }
    }

    revalidatePath('/admin/quests')
    return { success: true }
}

// Get Active Quest Progress for Boss Bar
export async function getActiveQuestProgress(teamId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Fetch Active Quest
    const { data: quest, error } = await supabaseAdmin
        .from('quests')
        .select(`
            id, 
            name, 
            tasks (
                id, 
                status_id,
                was_dropped,
                size:sizes!size_id(xp_points),
                status:statuses!status_id(category)
            )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .is('is_archived', false)
        .maybeSingle()

    if (error) {
        console.error('❌ BossBar Error: Failed to fetch active quest', error)
        return null
    }

    if (!quest) {
        return null // No active quest
    }

    // 2. Calculate Progress
    let totalXP = 0
    let currentXP = 0

    quest.tasks?.forEach((t: any) => {
        if (t.was_dropped) return // Exclude dropped/aborted missions

        const xp = t.size?.xp_points || 0
        totalXP += xp
        if (t.status?.category === 'done') {
            currentXP += xp
        }
    })

    const percentage = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0

    return {
        id: quest.id,
        name: quest.name,
        totalXP,
        currentXP,
        percentage
    }
}
