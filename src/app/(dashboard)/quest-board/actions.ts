'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- QUESTS ---

export async function getActiveQuest(teamId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .single() // Only one active quest allowed per team logic

    // suppress error if no active quest, just return null
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active quest:', error)
    }
    return data
}

export async function getQuests(teamId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function createQuest(formData: FormData) {
    const supabase = await createClient()
    const teamId = formData.get('teamId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const setActive = formData.get('setActive') === 'on'

    if (!teamId || !name) return { error: 'Missing required fields' }

    if (setActive) {
        // Deactivate other quests first
        await supabase
            .from('quests')
            .update({ is_active: false })
            .eq('team_id', teamId)
    }

    const { error } = await supabase.from('quests').insert({
        team_id: teamId,
        name,
        description,
        is_active: setActive,
        created_at: new Date().toISOString()
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/quest-board')
    return { success: true }
}

export async function toggleQuestActive(questId: string, teamId: string, isActive: boolean) {
    const supabase = await createClient()

    if (isActive) {
        // If enabling, disable others
        await supabase
            .from('quests')
            .update({ is_active: false })
            .eq('team_id', teamId)
            .neq('id', questId)
    }

    const { error } = await supabase
        .from('quests')
        .update({ is_active: isActive })
        .eq('id', questId)

    if (error) throw error
    revalidatePath('/quest-board')
}

// --- TASKS ---

export async function getTasks(questId: string) {
    const supabase = await createClient()

    try {
        // Ship Quest Doctrine: Rich query with all FK relations
        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                status:statuses(id, name, category),
                size:sizes(id, name, xp_points),
                urgency:urgencies(id, name, color, weight),
                quest:quests(id, name)
            `)
            .eq('quest_id', questId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (e) {
        console.error('getTasks: Rich query failed, falling back.', e)
        // Fallback to basic query
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('quest_id', questId)

        if (error) {
            console.error('getTasks: Fallback failed.', error)
            return []
        }
        return data || []
    }
}

export async function createTask(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const teamId = formData.get('teamId') as string
    const questId = formData.get('questId') as string
    const title = formData.get('title') as string
    const sizeId = formData.get('sizeId') as string
    const urgencyId = formData.get('urgencyId') as string
    const statusId = formData.get('statusId') as string

    if (!title || !questId || !teamId || !statusId) return { error: 'Missing required fields' }

    // Get XP from size
    let xpPoints = 0
    if (sizeId) {
        const { data: size } = await supabase.from('sizes').select('xp_points').eq('id', sizeId).single()
        if (size) xpPoints = size.xp_points
    }

    const { error } = await supabase.from('tasks').insert({
        team_id: teamId,
        quest_id: questId,
        title,
        status_id: statusId,
        size_id: sizeId,
        urgency_id: urgencyId,
        xp_points: xpPoints
    })

    if (error) return { error: error.message }

    revalidatePath('/quest-board')
    return { success: true }
}

export async function updateTaskStatus(taskId: string, statusId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', taskId)

    if (error) throw error
    revalidatePath('/quest-board')
}

// Manager-Only Task Assignment
export async function assignTaskToMember(taskId: string, teamId: string, assigneeId: string | null) {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'PROTOCOL ERROR: USER NOT AUTHENTICATED' }
    }

    // 2. Check role - Only MANAGER can assign tasks
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    if (memberError || !member) {
        return { success: false, error: 'PROTOCOL ERROR: NOT A MEMBER OF THIS ALLIANCE' }
    }

    if (member.role !== 'manager') {
        return { success: false, error: 'PROTOCOL ERROR: ACCESS RESERVED FOR [MANAGER] - Owners/Admins cannot assign tasks.' }
    }

    // 3. Perform assignment
    const { error: updateError } = await supabase
        .from('tasks')
        .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
        .eq('id', taskId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    revalidatePath('/quest-board')
    return { success: true }
}

