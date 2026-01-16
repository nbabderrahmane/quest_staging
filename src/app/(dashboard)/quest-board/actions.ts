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
    const bossSkin = (formData.get('boss_skin') as string) || 'generic_monster'
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
        boss_skin: bossSkin,
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
        .eq('team_id', teamId)

    if (error) throw error
    revalidatePath('/quest-board')
}

// --- TASKS ---

export async function getTasks(questId: string, teamId: string) {
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
                quest:quests(id, name),
                client:clients(id, name)
            `)
            .eq('quest_id', questId)
            .eq('team_id', teamId)
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
            .eq('team_id', teamId)

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

    // Recurrence Fields
    const isRecurring = formData.get('isRecurring') === 'true'
    const frequency = formData.get('recurrenceFrequency') as string
    const intervalStr = formData.get('recurrenceInterval') as string
    const startDateStr = formData.get('recurrenceStartDate') as string
    const endDateStr = formData.get('recurrenceEndDate') as string
    const daysRaw = formData.getAll('recurrenceDays') // .getAll because checkbox group

    if (!title || !questId || !teamId || !statusId) return { error: 'Missing required fields' }

    // Get XP from size
    let xpPoints = 0
    if (sizeId) {
        const { data: size } = await supabase.from('sizes').select('xp_points').eq('id', sizeId).single()
        if (size) xpPoints = size.xp_points
    }

    let recurrenceData: any = {}
    if (isRecurring) {
        recurrenceData.is_recurring = true
        recurrenceData.recurrence_rule = {
            frequency,
            interval: parseInt(intervalStr || '1'),
            days: daysRaw.map(d => parseInt(d as string)),
            start_date: startDateStr
        }

        // Calculate initial recurrence_next_date
        // IMPORTANT: The task we are creating RIGHT NOW is the first instance.
        // So the "next" date is based on the start date + interval.
        // If start date is today, and it's daily, next is tomorrow.

        const start = startDateStr ? new Date(startDateStr) : new Date()
        let nextDate = new Date(start)
        const interval = parseInt(intervalStr || '1')

        if (frequency === 'daily') {
            nextDate.setDate(nextDate.getDate() + interval)
        } else if (frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + (interval * 7))
            // If specific days are selected, logic is more complex for "next". 
            // For MVP (and as implied by "chaque x semaines"), let's stick to simple interval if days not strictly enforced or just use interval.
            // If "days" are selected, we should probably find the NEXT occurrence among those days.
            // But usually "weekly on Mon, Wed" means every Mon/Wed.
            // Let's implement a simple next date logic:
            // If days are present, find the next matching day after 'start'.
        } else if (frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + interval)
        }

        recurrenceData.recurrence_next_date = nextDate.toISOString()
        if (endDateStr) recurrenceData.recurrence_end_date = endDateStr
    }

    const { error } = await supabase.from('tasks').insert({
        team_id: teamId,
        quest_id: questId,
        title,
        status_id: statusId,
        size_id: sizeId,
        urgency_id: urgencyId,
        xp_points: xpPoints,
        ...recurrenceData
    })

    if (error) return { error: error.message }

    revalidatePath('/quest-board')
    return { success: true }
}

export async function updateTaskStatus(taskId: string, statusId: string, teamId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('team_id', teamId)

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
        .eq('team_id', teamId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    revalidatePath('/quest-board')
    return { success: true }
}

