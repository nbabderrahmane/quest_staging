'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// Get all available bosses for a team (System + Custom)
export async function getBosses(teamId: string) {
    const supabase = await createClient()

    // RLS policies should handle visibility, but we add the OR condition to be explicit about intent
    // (System bosses OR Custom bosses for this team)
    const { data, error } = await supabase
        .from('bosses')
        .select('*')
        .or(`is_system.eq.true,team_id.eq.${teamId}`)
        .order('is_system', { ascending: false }) // System first
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getBosses: Failed', JSON.stringify(error, null, 2))
        return { error: `[${error.code}] ${error.message}` }
    }

    // Deduplicate if RLS allows both overlaps (won't happen with correct schema but good safety)
    return data || []
}

// Upload a custom boss
// We use Base64 strings for images since they are strictly limited in size ("like emojis")
export async function createBoss(
    teamId: string,
    data: {
        name: string,
        description?: string,
        image_healthy: string,
        image_bloody: string,
        image_dead: string
    }
) {
    const ctx = await getRoleContext(teamId)
    // Only admins/owners can add custom bosses to maintain quality control
    if (!ctx || !['owner', 'admin'].includes(ctx.role || '')) {
        return { success: false, error: 'INSUFFICIENT CLEARANCE: Only commanders can add custom database entries.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'User not authenticated' }

    // Insert - Database Trigger 'check_boss_limit_trigger' will handle the "Max 10" limit
    const { error } = await supabase
        .from('bosses')
        .insert({
            team_id: teamId,
            name: data.name,
            description: data.description,
            is_system: false,
            image_healthy: data.image_healthy,
            image_bloody: data.image_bloody,
            image_dead: data.image_dead,
            created_by: user.id
        })

    if (error) {
        console.error('createBoss: Failed', error)
        // Check for specific trigger error
        if (error.message.includes('MAX_BOSSES_REACHED')) {
            return { success: false, error: 'MAX_LIMIT_REACHED: You cannot have more than 10 custom bosses.' }
        }
        return { success: false, error: `CREATION FAILED: ${error.message}` }
    }

    revalidatePath('/admin/bosses')
    return { success: true }
}

// Delete a custom boss
export async function deleteBoss(bossId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    if (!ctx || !['owner', 'admin'].includes(ctx.role || '')) {
        return { success: false, error: 'INSUFFICIENT CLEARANCE' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('bosses')
        .delete()
        .eq('id', bossId)
        .eq('team_id', teamId)
        .eq('is_system', false) // Safety check: Never delete system bosses via this action

    if (error) {
        console.error('deleteBoss: Failed', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/bosses')
    return { success: true }
}
