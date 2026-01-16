'use server'

import { createClient } from '@/lib/supabase/server'
import { Status, Size, Urgency } from '@/lib/types'
import { revalidatePath } from 'next/cache'

// RPG-themed error formatter
function formatForgeError(error: { code: string, message: string }): string {
    // Duplicate key violation
    if (error.code === '23505') {
        return 'DUPLICATE DETECTED: This parameter already exists in your Forge protocols.'
    }
    // RLS policy violation
    if (error.code === '42501' || error.message.includes('policy')) {
        return 'SECURITY BREACH: Your role does not permit data construction in this sector.'
    }
    // Foreign key violation
    if (error.code === '23503') {
        return 'INTEGRITY FAILURE: Referenced data does not exist in the archive.'
    }
    // Not null violation
    if (error.code === '23502') {
        return 'INCOMPLETE DATA: Required parameter is missing from transmission.'
    }
    // Default: show code and message
    return `SYSTEM ERROR [${error.code}]: ${error.message}`
}

async function checkAdmin(teamId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('PROTOCOL ERROR: USER NOT AUTHENTICATED')

    const { data: member, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    if (error || !member) {
        console.error('checkAdmin: Membership check failed', error)
        throw new Error('PROTOCOL ERROR: NOT A MEMBER OF THIS ALLIANCE')
    }

    if (!['owner', 'admin', 'manager'].includes(member.role)) {
        throw new Error('PROTOCOL ERROR: ACCESS RESERVED FOR [OWNER/ADMIN/MANAGER]')
    }
    return supabase
}

// --- STATUSES ---
export async function getStatuses(teamId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('statuses').select('*').eq('team_id', teamId).order('sort_order')
    return (data || []) as Status[]
}

// Ship Quest Doctrine: Unified CRUD payload
// All create functions accept: name, team_id, sort_order, category (when applicable)
export async function createStatus(prevState: unknown, formData: FormData) {
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0

    try {
        const supabase = await checkAdmin(teamId)
        const { error: insertError } = await supabase.from('statuses').insert({
            team_id: teamId,
            name,
            category,
            sort_order: sortOrder
        })

        if (insertError) {
            console.error('createStatus: Insert failed', insertError)
            return { success: false, error: formatForgeError(insertError) }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

export async function updateStatus(prevState: unknown, formData: FormData) {
    const id = formData.get('id') as string
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const isActive = formData.get('isActive') === 'true'

    try {
        const supabase = await checkAdmin(teamId)
        const { error } = await supabase.from('statuses').update({ name, is_active: isActive }).eq('id', id).eq('team_id', teamId)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// Toggle is_active for any item (statuses, sizes, urgencies)
export async function toggleItemActive(table: 'statuses' | 'sizes' | 'urgencies', id: string, teamId: string, currentValue: boolean) {
    try {
        const supabase = await checkAdmin(teamId)
        const { error } = await supabase.from(table).update({ is_active: !currentValue }).eq('id', id).eq('team_id', teamId)
        if (error) return { success: false, error: `[${error.code}] ${error.message}` }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// Update any Forge item (status, size, urgency)
export async function updateItem(
    table: 'statuses' | 'sizes' | 'urgencies',
    id: string,
    teamId: string,
    data: Record<string, unknown>
) {
    try {
        const supabase = await checkAdmin(teamId)
        // Remove id and team_id from update data to prevent cross-team modifications
        const { id: _id, team_id: _tid, created_at: _ca, ...rest } = data
        const updateData = rest

        const { error } = await supabase
            .from(table)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(updateData as any) // Explicit cast required for dynamic table update
            .eq('id', id)
            .eq('team_id', teamId) // Doctrine: always scope by team_id

        if (error) return { success: false, error: `[${error.code}] ${error.message}` }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// --- SIZES ---
export async function getSizes(teamId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('sizes').select('*').eq('team_id', teamId).order('sort_order')
    return (data || []) as Size[]
}

export async function createSize(prevState: unknown, formData: FormData) {
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const xp = parseInt(formData.get('xp') as string) || 0
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0

    try {
        const supabase = await checkAdmin(teamId)
        const { error: insertError } = await supabase.from('sizes').insert({
            team_id: teamId,
            name,
            xp_points: xp,
            sort_order: sortOrder
        })
        if (insertError) {
            console.error('createSize: Insert failed', insertError)
            return { success: false, error: formatForgeError(insertError) }
        }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// --- URGENCIES ---
export async function getUrgencies(teamId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('urgencies').select('*').eq('team_id', teamId).order('weight', { ascending: false })
    return (data || []) as Urgency[]
}

export async function createUrgency(prevState: unknown, formData: FormData) {
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const weight = parseInt(formData.get('weight') as string) || 0
    const color = formData.get('color') as string || 'blue'

    try {
        const supabase = await checkAdmin(teamId)
        const { error: insertError } = await supabase.from('urgencies').insert({
            team_id: teamId,
            name,
            weight,
            color
        })
        if (insertError) {
            return { success: false, error: formatForgeError(insertError) }
        }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

// --- QUEST STATUSES ---
export async function getQuestStatuses(teamId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('quest_statuses').select('*').eq('team_id', teamId).order('sort_order')
    return data || []
}

export async function createQuestStatus(prevState: unknown, formData: FormData) {
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const color = formData.get('color') as string || 'blue'
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0

    try {
        const supabase = await checkAdmin(teamId)
        const { error: insertError } = await supabase.from('quest_statuses').insert({
            team_id: teamId,
            name,
            color,
            sort_order: sortOrder
        })
        if (insertError) {
            return { success: false, error: formatForgeError(insertError) }
        }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

export async function deleteQuestStatus(id: string, teamId: string) {
    try {
        const supabase = await checkAdmin(teamId)
        const { error } = await supabase.from('quest_statuses').delete().eq('id', id)
        if (error) return { success: false, error: error.message }
        revalidatePath('/admin')
        return { success: true }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
}

