'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// Get all quests (objectives) for a team
export async function getQuestObjectives(teamId: string) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
        .from('quests')
        .select(`
            *,
            creator:profiles!created_by(id, email, first_name, last_name)
        `)
        .eq('team_id', teamId)
        .order('start_date', { ascending: false, nullsFirst: false })

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
            created_by: user.id,
            name: data.name.trim(),
            description: data.description?.trim() || null,
            start_date: data.start_date || null,
            end_date: data.end_date || null
        })

    if (error) {
        console.error('createQuestObjective: Failed', error)
        return { success: false, error: `QUEST INITIATION FAILED: ${error.message}` }
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
        .update({ ...data, updated_at: new Date().toISOString() })
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

